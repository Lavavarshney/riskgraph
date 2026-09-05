from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import ActionLog

router = APIRouter(prefix="/ledger", tags=["Ledger"])

@router.get("")
def get_ledger(limit: int = Query(50, ge=1), db: Session = Depends(get_db)):
    return db.query(ActionLog).order_by(ActionLog.timestamp.desc()).limit(limit).all()
