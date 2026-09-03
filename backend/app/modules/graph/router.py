from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.modules.graph.schemas import GraphData, AttackCluster, TransactionInvestigation
from app.modules.graph.engine import (
    build_subgraph_for_entity, calculate_network_risk, get_transaction_investigation,
    get_entity_summary, expand_entity_subgraph
)
from app.modules.graph.clusters import detect_attack_clusters, get_cluster_by_id

router = APIRouter(prefix="/graph", tags=["Network Graph Intelligence"])

@router.get("/summary/{entity_type}/{entity_id}")
def get_entity_summary_endpoint(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db)
):
    return get_entity_summary(db, entity_type, entity_id)

@router.get("/expand/{entity_type}/{entity_id}")
def expand_subgraph_endpoint(
    entity_type: str,
    entity_id: str,
    limit: int = Query(10, ge=1, le=25),
    db: Session = Depends(get_db)
):
    return expand_entity_subgraph(db, entity_type, entity_id, limit=limit)

@router.get("/entity/{entity_id}", response_model=GraphData)
@router.get("/subgraph/{entity_id}", response_model=GraphData)
def get_entity_subgraph_endpoint(
    entity_id: str,
    entity_type: Optional[str] = Query(None, description="customer, device, ip, payment_method, merchant, transaction, coupon"),
    depth: int = Query(2, ge=1, le=4),
    db: Session = Depends(get_db)
):
    """
    Fetch interactive multi-hop relationship graph surrounding an entity (Card, IP, Merchant, Device, Customer).
    """
    # Auto-detect entity_type from prefix if not explicitly provided
    if not entity_type:
        if entity_id.startswith("cust_"):
            entity_type = "customer"
        elif entity_id.startswith("dev_"):
            entity_type = "device"
        elif entity_id.startswith("ip_"):
            entity_type = "ip"
        elif entity_id.startswith("pm_"):
            entity_type = "payment_method"
        elif entity_id.startswith("mch_"):
            entity_type = "merchant"
        elif entity_id.startswith("tx_"):
            entity_type = "transaction"
        elif entity_id.startswith("cp_"):
            entity_type = "coupon"
        else:
            entity_type = "payment_method"

    nodes, edges, metrics = build_subgraph_for_entity(db, entity_type, entity_id, depth=depth)
    score, reasons, _ = calculate_network_risk(db, entity_type, entity_id)

    return GraphData(
        nodes=nodes,
        edges=edges,
        network_risk_score=score,
        reasons=reasons
    )


@router.get("/device/{device_id}", response_model=GraphData)
def get_device_graph_endpoint(
    device_id: str,
    depth: int = Query(2, ge=1, le=4),
    db: Session = Depends(get_db)
):
    nodes, edges, metrics = build_subgraph_for_entity(db, "device", device_id, depth=depth)
    score, reasons, _ = calculate_network_risk(db, "device", device_id)
    return GraphData(
        nodes=nodes,
        edges=edges,
        network_risk_score=score,
        reasons=reasons,
        network_signals=metrics.get("network_signals")
    )

@router.get("/customer/{customer_id}", response_model=GraphData)
def get_customer_graph_endpoint(
    customer_id: str,
    depth: int = Query(2, ge=1, le=4),
    db: Session = Depends(get_db)
):
    nodes, edges, metrics = build_subgraph_for_entity(db, "customer", customer_id, depth=depth)
    score, reasons, _ = calculate_network_risk(db, "customer", customer_id)
    return GraphData(
        nodes=nodes,
        edges=edges,
        network_risk_score=score,
        reasons=reasons,
        network_signals=metrics.get("network_signals")
    )

@router.get("/cluster/{cluster_id}", response_model=AttackCluster)
@router.get("/clusters/{cluster_id}", response_model=AttackCluster)
def get_cluster_detail_endpoint(
    cluster_id: str,
    db: Session = Depends(get_db)
):
    cluster = get_cluster_by_id(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Attack cluster {cluster_id} not found")
    return cluster

@router.get("/clusters", response_model=List[AttackCluster])
def get_attack_clusters_endpoint(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    return detect_attack_clusters(db, limit=limit)

@router.get("/transaction/{transaction_id}", response_model=TransactionInvestigation)
def get_transaction_investigation_endpoint(
    transaction_id: str,
    db: Session = Depends(get_db)
):
    return get_transaction_investigation(db, transaction_id)

