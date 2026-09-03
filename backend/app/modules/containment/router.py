from fastapi import APIRouter
from typing import List
from app.modules.containment.schemas import ContainmentRecommendation

router = APIRouter(prefix="/containment", tags=["Containment Recommendations"])

@router.get("/recommendations", response_model=List[ContainmentRecommendation])
def get_recommendations():
    """Retrieve real-time containment recommendations for active threats."""
    return []
