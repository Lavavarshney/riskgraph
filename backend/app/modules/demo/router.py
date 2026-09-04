from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.demo.engine import DemoOrchestrator, DEMO_STATE

router = APIRouter(prefix="/demo", tags=["Live Attack Demo Engine"])

@router.post("/simulate")
async def trigger_live_demo(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Triggers the 4-phase live attack demo simulation.
    Runs asynchronously in the background and streams live events over WebSockets.
    """
    # Always reset stuck state if re-triggered
    DEMO_STATE["is_running"] = False

    background_tasks.add_task(DemoOrchestrator.run_live_demo, db)
    return {
        "status": "STARTED",
        "message": "Live attack demo simulation initiated across 4 backend phases.",
        "websocket_url": "ws://localhost:8000/ws/payments"
    }

@router.post("/reset")
def reset_demo_state():
    DEMO_STATE["is_running"] = False
    DEMO_STATE["current_phase"] = "IDLE"
    DEMO_STATE["phase_number"] = 0
    DEMO_STATE["logs"] = []
    return {"status": "RESET"}

@router.get("/status")
def get_demo_status():
    """
    Returns current status and event timeline log of the live demo.
    """
    return DEMO_STATE
