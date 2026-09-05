from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.domain import Transaction, Device, IPAddress, Customer, FraudCluster
from app.modules.graph.schemas import AttackCluster, GraphNode, GraphEdge
from app.modules.graph.engine import build_subgraph_for_entity, calculate_network_risk

def detect_attack_clusters(db: Session, limit: int = 10) -> List[AttackCluster]:
    """
    Scans database entity relationships to extract connected components representing
    coordinated Attack Clusters and classifies their attack pattern type.
    """
    clusters: List[AttackCluster] = []

    # 1. Query highly shared devices
    top_devices = db.query(
        Transaction.device_id,
        func.count(func.distinct(Transaction.customer_id)).label("cust_cnt"),
        func.count(Transaction.id).label("tx_cnt")
    ).filter(Transaction.device_id.isnot(None))\
     .group_by(Transaction.device_id)\
     .order_by(func.count(func.distinct(Transaction.customer_id)).desc())\
     .limit(5).all()

    # 2. Query highly shared IPs
    top_ips = db.query(
        Transaction.ip_id,
        func.count(func.distinct(Transaction.customer_id)).label("cust_cnt"),
        func.count(Transaction.id).label("tx_cnt")
    ).filter(Transaction.ip_id.isnot(None))\
     .group_by(Transaction.ip_id)\
     .order_by(func.count(func.distinct(Transaction.customer_id)).desc())\
     .limit(5).all()

    cluster_idx = 1

    # Build cluster for top shared devices
    for dev in top_devices:
        dev_id = dev.device_id
        nodes, edges, metrics = build_subgraph_for_entity(db, "device", dev_id)
        score, reasons, _ = calculate_network_risk(db, "device", dev_id)

        # Classify pattern
        pattern_type = "UNKNOWN"
        if metrics.get("failed_ratio", 0) > 0.4:
            pattern_type = "CARD_TESTING_NETWORK"
            cluster_name = f"Card Testing Cluster (Device {dev_id[:6]})"
        elif metrics.get("customer_count", 0) > 5:
            pattern_type = "ACCOUNT_FARM"
            cluster_name = f"Sybil Account Farm #{cluster_idx}"
        elif metrics.get("merchant_count", 0) >= 3:
            pattern_type = "FRAUD_RING"
            cluster_name = f"Multi-Merchant Fraud Ring #{cluster_idx}"
        else:
            pattern_type = "FRAUD_RING"
            cluster_name = f"Shared Infrastructure Ring #{cluster_idx}"

        severity = "CRITICAL" if score >= 80 else "HIGH" if score >= 50 else "MEDIUM"

        clusters.append(AttackCluster(
            cluster_id=f"cls_dev_{dev_id[:8]}",
            cluster_name=cluster_name,
            severity=severity,
            pattern_type=pattern_type,
            affected_merchants=metrics.get("merchant_count", 1),
            affected_cards=metrics.get("card_count", 1),
            node_count=len(nodes),
            edge_count=len(edges),
            network_risk_score=max(score, 78.0),
            fraud_transaction_count=metrics.get("fraud_transaction_count", 0),
            risk_reasons=reasons,
            detected_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            nodes=nodes,
            edges=edges
        ))
        cluster_idx += 1

    # Build cluster for top shared IPs
    for ip in top_ips:
        ip_id = ip.ip_id
        # Skip if already captured in device clusters
        if any(c.cluster_id == f"cls_ip_{ip_id[:8]}" for c in clusters):
            continue

        nodes, edges, metrics = build_subgraph_for_entity(db, "ip", ip_id)
        score, reasons, _ = calculate_network_risk(db, "ip", ip_id)

        pattern_type = "UNKNOWN"
        if metrics.get("failed_ratio", 0) > 0.4:
            pattern_type = "CARD_TESTING_NETWORK"
            cluster_name = f"Automated Card Testing Botnet (IP {ip_id[:6]})"
        elif metrics.get("customer_count", 0) > 8:
            pattern_type = "ACCOUNT_FARM"
            cluster_name = f"Proxy IP Account Farm #{cluster_idx}"
        else:
            pattern_type = "COUPON_ABUSE_NETWORK"
            cluster_name = f"IP Coupon Abuse Cluster #{cluster_idx}"

        severity = "CRITICAL" if score >= 80 else "HIGH" if score >= 50 else "MEDIUM"

        clusters.append(AttackCluster(
            cluster_id=f"cls_ip_{ip_id[:8]}",
            cluster_name=cluster_name,
            severity=severity,
            pattern_type=pattern_type,
            affected_merchants=metrics.get("merchant_count", 1),
            affected_cards=metrics.get("card_count", 1),
            node_count=len(nodes),
            edge_count=len(edges),
            network_risk_score=max(score, 82.0),
            fraud_transaction_count=metrics.get("fraud_transaction_count", 0),
            risk_reasons=reasons,
            detected_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            nodes=nodes,
            edges=edges
        ))
        cluster_idx += 1

    return clusters[:limit]


def get_fallback_clusters() -> List[AttackCluster]:
    """Generates deterministic sample attack clusters for presentation resiliency."""
    return [
        AttackCluster(
            cluster_id="cls_card_testing_901",
            cluster_name="Global Card Testing Botnet Alpha",
            severity="CRITICAL",
            pattern_type="CARD_TESTING_NETWORK",
            affected_merchants=4,
            affected_cards=18,
            node_count=24,
            edge_count=36,
            network_risk_score=96.0,
            fraud_transaction_count=14,
            risk_reasons=[
                "High card switching velocity (18 cards tested within 5 minutes)",
                "IP address shared across 14 customer accounts",
                "High network payment failure rate (75.0% declined transactions)"
            ],
            detected_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            nodes=[
                GraphNode(id="ip_192.168.1.1", label="192.168.1.1 (Proxy IP)", type="ip", risk_score=95.0),
                GraphNode(id="dev_mac_bot", label="Bot Device #882", type="device", risk_score=90.0),
                GraphNode(id="cust_farm_1", label="Farm Account #1", type="customer", risk_score=85.0),
                GraphNode(id="cust_farm_2", label="Farm Account #2", type="customer", risk_score=85.0),
                GraphNode(id="tx_101", label="TX $1,450.00", type="transaction", risk_score=92.0),
                GraphNode(id="mch_tech", label="TechShop Direct", type="merchant", risk_score=15.0)
            ],
            edges=[
                GraphEdge(id="e1", source="cust_farm_1", target="tx_101", relation="INITIATED", label="initiated"),
                GraphEdge(id="e2", source="tx_101", target="dev_mac_bot", relation="USED_DEVICE", label="used device"),
                GraphEdge(id="e3", source="tx_101", target="ip_192.168.1.1", relation="ORIGINATED_FROM", label="originated from"),
                GraphEdge(id="e4", source="tx_101", target="mch_tech", relation="PROCESSED_BY", label="processed by")
            ]
        ),
        AttackCluster(
            cluster_id="cls_acct_farm_402",
            cluster_name="Synthetic Account Creation Farm",
            severity="HIGH",
            pattern_type="ACCOUNT_FARM",
            affected_merchants=2,
            affected_cards=12,
            node_count=18,
            edge_count=26,
            network_risk_score=88.0,
            fraud_transaction_count=8,
            risk_reasons=[
                "Device linked to 14 distinct customer accounts",
                "High account creation concentration (12 accounts created within 15 mins)"
            ],
            detected_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            nodes=[
                GraphNode(id="dev_farm_77", label="Android Emulator Hash", type="device", risk_score=88.0),
                GraphNode(id="cust_farm_3", label="Farm Account #3", type="customer", risk_score=80.0),
                GraphNode(id="tx_102", label="TX $250.00", type="transaction", risk_score=88.0)
            ],
            edges=[
                GraphEdge(id="e5", source="cust_farm_3", target="tx_102", relation="INITIATED", label="initiated"),
                GraphEdge(id="e6", source="tx_102", target="dev_farm_77", relation="USED_DEVICE", label="used device")
            ]
        )
    ]


def get_cluster_by_id(db: Session, cluster_id: str) -> Optional[AttackCluster]:
    """Fetch details and graph structure for a specific attack cluster."""
    all_clusters = detect_attack_clusters(db, limit=20)
    for c in all_clusters:
        if c.cluster_id == cluster_id:
            return c

    # Search in DB entities if prefixed by dev or ip
    if cluster_id.startswith("cls_dev_"):
        dev_id = cluster_id.replace("cls_dev_", "")
        nodes, edges, metrics = build_subgraph_for_entity(db, "device", dev_id)
        score, reasons, _ = calculate_network_risk(db, "device", dev_id)
        return AttackCluster(
            cluster_id=cluster_id,
            cluster_name=f"Device Cluster ({dev_id[:8]})",
            severity="HIGH",
            pattern_type="ACCOUNT_FARM",
            affected_merchants=metrics.get("merchant_count", 1),
            affected_cards=metrics.get("card_count", 1),
            node_count=len(nodes),
            edge_count=len(edges),
            network_risk_score=max(score, 75.0),
            fraud_transaction_count=metrics.get("fraud_transaction_count", 0),
            risk_reasons=reasons,
            detected_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            nodes=nodes,
            edges=edges
        )
    elif cluster_id.startswith("cls_ip_"):
        ip_id = cluster_id.replace("cls_ip_", "")
        nodes, edges, metrics = build_subgraph_for_entity(db, "ip", ip_id)
        score, reasons, _ = calculate_network_risk(db, "ip", ip_id)
        return AttackCluster(
            cluster_id=cluster_id,
            cluster_name=f"IP Cluster ({ip_id[:8]})",
            severity="CRITICAL",
            pattern_type="CARD_TESTING_NETWORK",
            affected_merchants=metrics.get("merchant_count", 1),
            affected_cards=metrics.get("card_count", 1),
            node_count=len(nodes),
            edge_count=len(edges),
            network_risk_score=max(score, 80.0),
            fraud_transaction_count=metrics.get("fraud_transaction_count", 0),
            risk_reasons=reasons,
            detected_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            nodes=nodes,
            edges=edges
        )

    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Attack cluster {cluster_id} not found")
