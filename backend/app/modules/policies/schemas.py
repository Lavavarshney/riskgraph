from pydantic import BaseModel
from typing import Optional

class MerchantPolicyBase(BaseModel):
    name: str = "Default Merchant Policy"
    individual_risk_threshold: float = 80.0
    network_risk_threshold: float = 85.0
    auto_block_enabled: bool = True
    auto_challenge_enabled: bool = True
    device_quarantine_threshold: int = 8
    ip_quarantine_threshold: int = 10
    minimum_account_age_for_auto_block: int = 0
    maximum_transaction_amount_for_auto_block: float = 1000.0

class MerchantPolicyCreate(MerchantPolicyBase):
    pass

class MerchantPolicyUpdate(BaseModel):
    name: Optional[str] = None
    individual_risk_threshold: Optional[float] = None
    network_risk_threshold: Optional[float] = None
    auto_block_enabled: Optional[bool] = None
    auto_challenge_enabled: Optional[bool] = None
    device_quarantine_threshold: Optional[int] = None
    ip_quarantine_threshold: Optional[int] = None
    minimum_account_age_for_auto_block: Optional[int] = None
    maximum_transaction_amount_for_auto_block: Optional[float] = None

class MerchantPolicySchema(MerchantPolicyBase):
    id: str

    class Config:
        from_attributes = True

class PolicyEvaluationResult(BaseModel):
    is_allowed: bool
    reason: str
