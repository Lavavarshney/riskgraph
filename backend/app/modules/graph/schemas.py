from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class NetworkSignals(BaseModel):
    device_account_count: int = 1
    ip_account_count: int = 1
    payment_method_account_count: int = 1
    shared_device_ratio: float = 0.0
    shared_ip_ratio: float = 0.0
    connected_transaction_count: int = 1
    flagged_connected_transaction_count: int = 0
    new_account_cluster_size: int = 0

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # customer, device, ip, payment_method, merchant, transaction, coupon
    risk_score: float = 0.0
    details: Optional[Dict[str, Any]] = None

class GraphEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    relation: str
    label: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    network_risk_score: float = 0.0
    reasons: List[str] = []
    network_signals: Optional[NetworkSignals] = None

class AttackCluster(BaseModel):
    cluster_id: str
    cluster_name: str
    severity: str  # HIGH, CRITICAL, MEDIUM, LOW
    pattern_type: str  # CARD_TESTING_NETWORK, ACCOUNT_FARM, FRAUD_RING, ACCOUNT_TAKEOVER_NETWORK, COUPON_ABUSE_NETWORK, UNKNOWN
    affected_merchants: int = 1
    affected_cards: int = 1
    node_count: int = 0
    edge_count: int = 0
    network_risk_score: float = 0.0
    fraud_transaction_count: int = 0
    risk_reasons: List[str] = []
    detected_at: Optional[str] = None
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    network_signals: Optional[NetworkSignals] = None

class TransactionInvestigation(BaseModel):
    transaction_id: str
    amount: float
    currency: str = "USD"
    merchant_id: str
    customer_id: str
    device_id: str
    ip_id: str
    payment_method_id: str
    coupon_id: Optional[str] = None
    timestamp: str
    status: str
    is_fraud: bool = False
    fraud_type: str = "NORMAL"

    # Individual ML Risk (Step 3)
    individual_risk_score: float
    individual_fraud_probability: float
    individual_decision: str
    individual_reasons: List[str]

    # Network Context Risk (Step 4)
    network_risk_score: float
    network_decision: str
    network_reasons: List[str]

    # Combined Assessment
    overall_decision: str
    risk_delta: float  # network_risk_score - individual_risk_score
    risk_summary: str
    traversal_breakdown: str

    # Subgraph representation
    graph_data: GraphData

