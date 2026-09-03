from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class InvestigationReport(BaseModel):
    transaction_id: str
    summary: str
    evidence: List[str]
    attack_pattern: str
    recommended_action: Dict[str, Any]
    confidence: float
    limitations: str
    risk_breakdown: Dict[str, Any]
    policy_status: Dict[str, Any]

class InvestigationChatRequest(BaseModel):
    question: str

class InvestigationChatResponse(BaseModel):
    answer: str
    citations: List[str]
