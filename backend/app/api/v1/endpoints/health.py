from fastapi import APIRouter
from datetime import datetime
from app.core.config import settings
from app.core.database import check_db_connection

router = APIRouter()

@router.get("/health")
def health_check():
    """System health endpoint returning database status and backend service state."""
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status.get("connected") else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status
    }
