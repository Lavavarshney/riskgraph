from pydantic import BaseModel
from typing import List, Dict, Any

class ContainmentRecommendation(BaseModel):
    id: str
    target_entity: str
    entity_type: str
    recommended_action: str  # BLOCK_IP, BLOCK_CARD, REQUIRE_3DS, THROTTLE_MERCHANT
    risk_reduction_estimate: float
    confidence: float
    reasoning: str
