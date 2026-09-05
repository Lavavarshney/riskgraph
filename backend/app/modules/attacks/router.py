from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.modules.attacks.schemas import AttackCluster, ContainmentCandidate, ActionLogRecord
from app.modules.attacks.engine import NetworkRiskEngine
from app.modules.containment.engine import ContainmentOptimizer
from app.core.websockets import ws_manager

router = APIRouter(prefix="/attacks", tags=["Coordinated Attack Engine"])

# In-memory store for contained state overrides during active server session
CONTAINED_CLUSTERS = set()

@router.get("/active", response_model=List[AttackCluster])
def get_active_attacks(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Scans database entity relationships and returns all active coordinated attack clusters
    evaluated by NetworkRiskEngine across 9 network signals.
    """
    clusters: List[AttackCluster] = []

    from sqlalchemy import func
    from app.models.domain import Transaction

    # 1. Query top devices
    top_devices = db.query(Transaction.device_id)\
        .filter(Transaction.device_id.isnot(None))\
        .group_by(Transaction.device_id)\
        .order_by(func.count(func.distinct(Transaction.customer_id)).desc())\
        .limit(5).all()

    # 2. Query top IPs
    top_ips = db.query(Transaction.ip_id)\
        .filter(Transaction.ip_id.isnot(None))\
        .group_by(Transaction.ip_id)\
        .order_by(func.count(func.distinct(Transaction.customer_id)).desc())\
        .limit(5).all()

    for dev in top_devices:
        dev_id = dev.device_id
        try:
            c = NetworkRiskEngine.evaluate_attack_cluster(
                db=db,
                cluster_id=f"cls_dev_{dev_id[:8]}",
                cluster_name=f"Device Cluster #{dev_id[:8]}",
                entity_type="device",
                entity_id=dev_id
            )
            if c.cluster_id in CONTAINED_CLUSTERS:
                c.status = "CONTAINED"
            if c.affected_accounts >= 1:
                clusters.append(c)
        except Exception as e:
            print(f"[!] Device cluster query warning: {e}")

    for ip in top_ips:
        ip_id = ip.ip_id
        try:
            c = NetworkRiskEngine.evaluate_attack_cluster(
                db=db,
                cluster_id=f"cls_ip_{ip_id[:8]}",
                cluster_name=f"IP Cluster #{ip_id[:8]}",
                entity_type="ip",
                entity_id=ip_id
            )
            if c.cluster_id in CONTAINED_CLUSTERS:
                c.status = "CONTAINED"
            if c.affected_accounts >= 1 and not any(ext.cluster_id == c.cluster_id for ext in clusters):
                clusters.append(c)
        except Exception as e:
            print(f"[!] IP cluster query warning: {e}")

    clusters.sort(key=lambda c: c.final_combined_risk, reverse=True)
    return clusters[:limit]


@router.get("/{cluster_id}", response_model=AttackCluster)
def get_attack_cluster_by_id(
    cluster_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves full details, graph topology, network signals, and timeline for a specific attack cluster.
    """
    active_clusters = get_active_attacks(limit=20, db=db)
    for cluster in active_clusters:
        if cluster.cluster_id == cluster_id:
            return cluster

    # Direct dynamic lookup if prefixed
    if cluster_id.startswith("cls_dev_"):
        dev_id = cluster_id.replace("cls_dev_", "")
        c = NetworkRiskEngine.evaluate_attack_cluster(
            db=db,
            cluster_id=cluster_id,
            cluster_name=f"Device Cluster #{cluster_id[:8]}",
            entity_type="device",
            entity_id=dev_id
        )
        if cluster_id in CONTAINED_CLUSTERS:
            c.status = "CONTAINED"
        return c

    elif cluster_id.startswith("cls_ip_"):
        ip_id = cluster_id.replace("cls_ip_", "")
        c = NetworkRiskEngine.evaluate_attack_cluster(
            db=db,
            cluster_id=cluster_id,
            cluster_name=f"IP Cluster #{cluster_id[:8]}",
            entity_type="ip",
            entity_id=ip_id
        )
        if cluster_id in CONTAINED_CLUSTERS:
            c.status = "CONTAINED"
        return c

    raise HTTPException(status_code=404, detail=f"Attack cluster {cluster_id} not found")


@router.get("/{cluster_id}/containment-options", response_model=List[ContainmentCandidate])
def get_containment_options(
    cluster_id: str,
    db: Session = Depends(get_db)
):
    """
    Runs Fraud Containment Optimizer to find minimum-cost choke points 
    and returns ranked containment candidates for an active attack cluster.
    """
    cluster = get_attack_cluster_by_id(cluster_id=cluster_id, db=db)
    return ContainmentOptimizer.evaluate_containment_options(cluster)


from app.modules.attacks.counterfactual import CounterfactualSimulator
from app.modules.attacks.schemas import CounterfactualScenario

@router.get("/{cluster_id}/counterfactual", response_model=CounterfactualScenario)
def get_counterfactual_simulation(
    cluster_id: str,
    db: Session = Depends(get_db)
):
    """
    Calculates counterfactual attack scenarios: Scenario A (Without RiskGraph) 
    vs Scenario B (With RiskGraph Containment).
    Returns timeline projection points and protected metrics.
    """
    cluster = get_attack_cluster_by_id(cluster_id=cluster_id, db=db)
    return CounterfactualSimulator.simulate_attack_trajectories(cluster)


@router.post("/{cluster_id}/contain")
async def contain_attack_cluster(
    cluster_id: str,
    payload: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """
    Executes containment action: records immutable ActionLog, updates entity state in PostgreSQL, 
    transitions cluster state to CONTAINED, and broadcasts live WebSocket alert.
    Evaluates action against MerchantPolicy first.
    """
    from app.modules.policies.engine import PolicyEngine
    
    cluster = get_attack_cluster_by_id(cluster_id=cluster_id, db=db)
    
    action = payload.get("action", "QUARANTINE_DEVICE") if payload else "QUARANTINE_DEVICE"
    target_id = payload.get("target_id", "dev_stealth_c91_primary") if payload else "dev_stealth_c91_primary"
    reason = payload.get("reason", "Disrupts network choke point") if payload else "Disrupts network choke point"

    # Evaluate Policy
    eval_result = PolicyEngine.evaluate_action(db=db, action=action, target=target_id, cluster=cluster)
    
    if not eval_result.is_allowed:
        # Log the blocked attempt
        action_log = ContainmentOptimizer.execute_containment_action(
            db=db,
            cluster_id=cluster_id,
            action=action,
            target_id=target_id,
            reason=f"BLOCKED BY POLICY: {eval_result.reason}"
        )
        # Update result to BLOCKED_BY_POLICY
        action_log.result = "BLOCKED_BY_POLICY"
        # In a real app we'd update the DB record too, but this is a simulation return
        
        return {
            "status": "REQUIRES_MANUAL_APPROVAL",
            "cluster_id": cluster_id,
            "action": action,
            "target": target_id,
            "reason": eval_result.reason,
            "action_log": action_log
        }

    CONTAINED_CLUSTERS.add(cluster_id)

    # Persist in immutable ActionLog table
    action_log = ContainmentOptimizer.execute_containment_action(
        db=db,
        cluster_id=cluster_id,
        action=action,
        target_id=target_id,
        reason=reason
    )
    
    event_payload = {
        "event": "ATTACK_CONTAINED",
        "cluster_id": cluster_id,
        "action": action,
        "target": target_id,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "CONTAINED",
        "message": f"Attack cluster {cluster_id} contained via {action} on {target_id}."
    }
    
    try:
        await ws_manager.broadcast(event_payload)
    except Exception as e:
        print(f"[!] WebSocket broadcast error: {e}")

    return {
        "status": "CONTAINED",
        "cluster_id": cluster_id,
        "action_log": action_log,
        "message": f"Cluster {cluster_id} state updated to CONTAINED.",
        "contained_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

@router.post("/{cluster_id}/contain/override")
async def override_containment_action(
    cluster_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Handles manual approval/rejection of a policy-blocked containment action.
    """
    decision = payload.get("decision")  # APPROVE or REJECT
    action = payload.get("action", "QUARANTINE_DEVICE")
    target_id = payload.get("target_id", "dev_stealth_c91_primary")
    
    if decision == "REJECT":
        action_log = ContainmentOptimizer.execute_containment_action(
            db=db,
            cluster_id=cluster_id,
            action=action,
            target_id=target_id,
            reason="MANUAL REJECTION: Operator rejected policy override."
        )
        action_log.result = "REJECTED_BY_OPERATOR"
        return {
            "status": "REJECTED",
            "cluster_id": cluster_id,
            "action_log": action_log,
            "message": "Action manually rejected."
        }
        
    if decision == "APPROVE":
        CONTAINED_CLUSTERS.add(cluster_id)
        action_log = ContainmentOptimizer.execute_containment_action(
            db=db,
            cluster_id=cluster_id,
            action=action,
            target_id=target_id,
            reason="MANUAL APPROVAL: Operator approved policy override."
        )
        action_log.result = "MANUAL_APPROVAL"
        
        event_payload = {
            "event": "ATTACK_CONTAINED",
            "cluster_id": cluster_id,
            "action": action,
            "target": target_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "CONTAINED",
            "message": f"Attack cluster {cluster_id} contained via MANUAL APPROVAL for {action} on {target_id}."
        }
        try:
            await ws_manager.broadcast(event_payload)
        except Exception:
            pass

        return {
            "status": "CONTAINED",
            "cluster_id": cluster_id,
            "action_log": action_log,
            "message": "Action manually approved and executed.",
            "contained_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }

