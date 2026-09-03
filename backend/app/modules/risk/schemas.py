from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class RiskScoreResponse(BaseModel):
    transaction_id: str
    risk_score: int = Field(ge=0, le=100, description="Risk score from 0 to 100")
    fraud_probability: float = Field(ge=0.0, le=1.0, description="Fraud probability from 0.0 to 1.0")
    decision: str = Field(description="ALLOW, STEP_UP, or BLOCK_REVIEW")
    top_reasons: List[str] = Field(description="SHAP-derived top contributing signals")
    shap_contributions: Optional[Dict[str, float]] = None
    features: Optional[Dict[str, float]] = None

class RiskEvaluationRequest(BaseModel):
    id: Optional[str] = None
    merchant_id: Optional[str] = "mch_1"
    customer_id: Optional[str] = "cust_1"
    device_id: Optional[str] = "dev_1"
    ip_id: Optional[str] = "ip_1"
    payment_method_id: Optional[str] = "pm_1"
    amount: float = Field(gt=0, description="Transaction amount in USD")
    country: Optional[str] = "USA"
    coupon_id: Optional[str] = None
    failed_attempts_recent: Optional[int] = 0
    account_age_minutes: Optional[int] = 1440
    fraud_type: Optional[str] = None
