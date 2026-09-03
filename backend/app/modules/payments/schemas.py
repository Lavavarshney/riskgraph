from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PaymentCreate(BaseModel):
    merchant_id: str
    amount: float = Field(gt=0, description="Transaction amount in USD")
    currency: str = "USD"
    card_hash: str
    ip_address: str
    device_id: str

class PaymentResponse(BaseModel):
    id: str
    merchant_id: str
    amount: float
    currency: str
    card_hash: str
    ip_address: str
    device_id: str
    status: str
    risk_score: float
    created_at: datetime

    class Config:
        from_attributes = True
