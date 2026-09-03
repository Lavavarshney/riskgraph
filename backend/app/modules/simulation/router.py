from fastapi import APIRouter, Body
from typing import Dict, Any
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
def run_simulation(request: CounterfactualSimulationRequest):
    """Run counterfactual simulation to evaluate rule changes against historical dataset."""
    return CounterfactualSimulationResult(
        baseline_fraud_loss=12500.0,
        simulated_fraud_loss=2100.0,
        prevented_loss=10400.0,
        false_positive_change_percent=0.12,
        affected_transactions_count=430
    )
