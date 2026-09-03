from pydantic import BaseModel
from typing import Dict, Any, List

class CounterfactualSimulationRequest(BaseModel):
    policy_changes: Dict[str, Any]
    timeframe_days: int = 7

class CounterfactualSimulationResult(BaseModel):
    baseline_fraud_loss: float
    simulated_fraud_loss: float
    prevented_loss: float
    false_positive_change_percent: float
    affected_transactions_count: int
