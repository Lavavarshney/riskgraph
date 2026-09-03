from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.investigations.schemas import InvestigationReport, InvestigationChatRequest, InvestigationChatResponse
from app.modules.investigations.agent import InvestigationAgent

router = APIRouter(prefix="/investigations", tags=["AI Investigation Agent"])

@router.post("/{transaction_id}", response_model=InvestigationReport)
def run_investigation(transaction_id: str, db: Session = Depends(get_db)):
    """
    Triggers AI Investigation Agent for a transaction.
    Synthesizes structured evidence report strictly from backend tools.
    """
    return InvestigationAgent.run_investigation(db=db, tx_id=transaction_id)

@router.post("/{transaction_id}/chat", response_model=InvestigationChatResponse)
def ask_investigation_question(
    transaction_id: str,
    payload: InvestigationChatRequest,
    db: Session = Depends(get_db)
):
    """
    Handles follow-up analyst Q&A for a transaction investigation.
    Answers strictly using backend tools and cited evidence.
    """
    return InvestigationAgent.answer_chat_question(db=db, tx_id=transaction_id, question=payload.question)
