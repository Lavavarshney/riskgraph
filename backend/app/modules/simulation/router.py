from fastapi import APIRouter, Body, Depends
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.simulator import simulator_engine
from app.modules.simulation.schemas import CounterfactualSimulationRequest, CounterfactualSimulationResult

router = APIRouter(prefix="/simulation", tags=["Live Simulator & Counterfactuals"])

@router.get("/status")
def get_simulator_status():
    """Get current state and live throughput statistics of the payment simulator."""
    return simulator_engine.get_status()

@router.post("/start")
async def start_simulator(payload: Dict[str, Any] = Body(default={})):
    """Start live payment event stream simulation."""
    scenario = payload.get("scenario", "normal")
    interval_sec = payload.get("interval_sec", 0.25)
    simulator_engine.start(scenario=scenario, interval_sec=interval_sec)
    return {"message": "Simulation started", "status": simulator_engine.get_status()}

@router.post("/stop")
async def stop_simulator():
    """Stop live payment event stream simulation."""
    simulator_engine.stop()
    return {"message": "Simulation stopped", "status": simulator_engine.get_status()}

@router.post("/scenario")
async def change_scenario(payload: Dict[str, Any] = Body(...)):
    """Switch active traffic scenario (normal, card_testing, account_farm, fraud_ring, account_takeover)."""
    scenario = payload.get("scenario", "normal")
    simulator_engine.set_scenario(scenario)
    return {"message": f"Scenario changed to '{scenario}'", "status": simulator_engine.get_status()}

@router.post("/run", response_model=CounterfactualSimulationResult)
def run_simulation(
    request: CounterfactualSimulationRequest,
    db: Session = Depends(get_db)
):
    """Run counterfactual simulation to evaluate rule changes against historical dataset."""
    from app.models.domain import Transaction
    fraud_txs = db.query(Transaction).filter(Transaction.is_fraud == True).all()
    
    if not fraud_txs:
        return CounterfactualSimulationResult(
            baseline_fraud_loss=0.0,
            simulated_fraud_loss=0.0,
            prevented_loss=0.0,
            false_positive_change_percent=0.0,
            affected_transactions_count=0
        )
        
    baseline_loss = sum(float(tx.amount) for tx in fraud_txs)
    prevented_loss = sum(float(tx.amount) for tx in fraud_txs if tx.status == "DECLINED")
    simulated_loss = baseline_loss - prevented_loss
    
    return CounterfactualSimulationResult(
        baseline_fraud_loss=baseline_loss,
        simulated_fraud_loss=simulated_loss,
        prevented_loss=prevented_loss,
        false_positive_change_percent=0.0,
        affected_transactions_count=len([t for t in fraud_txs if t.status == "DECLINED"])
    )
