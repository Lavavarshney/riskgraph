from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class NetworkSignals(BaseModel):
    shared_device_activity: float = 0.0
    shared_ip_activity: float = 0.0
    shared_payment_methods: float = 0.0
    shared_coupons: float = 0.0
    rapid_account_creation: float = 0.0
    transaction_timing_similarity: float = 0.0
    transaction_amount_similarity: float = 0.0
    connected_suspicious_transactions: float = 0.0
    historical_suspicious_entities: float = 0.0
    raw_metrics: Optional[Dict[str, Any]] = None

class AttackTimelineEvent(BaseModel):
    timestamp: str
    state: str  # NORMAL, EMERGING, SUSPECTED, CONFIRMED, CONTAINED
    risk_score: float
    trigger_event: str
    description: str

class AttackCluster(BaseModel):
    cluster_id: str
    cluster_name: str
    status: str = "EMERGING"  # NORMAL, EMERGING, SUSPECTED, CONFIRMED, CONTAINED
    severity: str = "HIGH"    # LOW, MEDIUM, HIGH, CRITICAL
    pattern_type: str = "FRAUD_RING"
    
    # Counts & Metrics
    affected_accounts: int = 1
    affected_devices: int = 1
    affected_ips: int = 1
    affected_merchants: int = 1
    affected_cards: int = 1
    node_count: int = 0
    edge_count: int = 0
    transaction_count: int = 0
    fraud_transaction_count: int = 0
    
    # Risk Scores
    network_risk_score: float = 0.0
    individual_risk_avg: float = 0.0
    final_combined_risk: float = 0.0
    
    # Probabilities & Explanations
    attack_type_probability: Dict[str, float] = Field(default_factory=dict)
    risk_reasons: List[str] = Field(default_factory=list)
    
    # Graph Topology
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Signals & Lifecycle History
    network_signals: Optional[NetworkSignals] = None
    progression_timeline: List[AttackTimelineEvent] = Field(default_factory=list)
    
    detected_at: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))
    last_updated_at: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))

class CombinedRiskEvaluation(BaseModel):
    transaction_id: Optional[str] = None
    transaction_risk: float
    behavioral_risk: float
    network_risk: float
    cluster_amplification: float
    final_risk_score: float
    decision: str
    explanation: str
    scoring_formula: str = "min(100, max(tx_risk, beh_risk) * 0.35 + network_risk * 0.65 + cluster_amplification)"

class ContainmentCandidate(BaseModel):
    option_id: str
    action: str             # QUARANTINE_DEVICE, QUARANTINE_IP, DISABLE_COUPON, FLAG_PAYMENT_METHOD, FLAG_CUSTOMER, BLOCK_INDIVIDUAL_TRANSACTIONS
    target_id: str          # Entity ID or '31_transactions'
    target_label: str       # e.g., 'Device D91 (fp_emulator_android_v11_c91)'
    transactions_affected: int
    estimated_loss_prevented: float
    collateral_risk: str    # LOW, MEDIUM, HIGH
    coverage_percentage: float  # e.g., 87.0
    reason: str
    is_recommended: bool = False
    operational_cost: str   # LOW, MEDIUM, HIGH

class ActionLogRecord(BaseModel):
    id: str
    timestamp: str
    cluster_id: str
    action: str
    target: str
    reason: str
    policy_id: str = "POL_CONTAIN_AUTO_v1"
    result: str = "SUCCESS"

class CounterfactualPoint(BaseModel):
    time_offset_minutes: int
    timestamp_label: str
    without_riskgraph_transactions: int
    without_riskgraph_loss: float
    with_riskgraph_transactions: int
    with_riskgraph_loss: float

class CounterfactualScenario(BaseModel):
    cluster_id: str
    cluster_name: str
    disclaimer: str = "Simulated counterfactual projection based on observed cluster growth rate. Not a guaranteed real-world prediction."
    
    # Scenario A: Without RiskGraph
    without_riskgraph: Dict[str, Any]
    
    # Scenario B: With RiskGraph
    with_riskgraph: Dict[str, Any]
    
    # Timeline points for line graph
    timeline: List[CounterfactualPoint]

