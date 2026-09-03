import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.core.websockets import ws_manager
from app.models.domain import Transaction, Merchant, Customer, Device, IPAddress, PaymentMethod
from app.modules.attacks.engine import NetworkRiskEngine
from app.modules.containment.engine import ContainmentOptimizer
from app.modules.attacks.counterfactual import CounterfactualSimulator

# Global in-memory log of recent demo run events
DEMO_STATE: Dict[str, Any] = {
    "is_running": False,
    "current_phase": "IDLE",
    "phase_number": 0,
    "logs": [],
    "last_run_at": None,
    "demo_data": {}
}

class DemoOrchestrator:
    """
    Orchestrates the 4-phase end-to-end live attack simulation.
    Drives real database updates and streams WebSocket events to the frontend.
    """

    @staticmethod
    async def broadcast_event(phase: str, phase_num: int, message: str, payload: Dict[str, Any] = None):
        now_time = datetime.now().strftime("%H:%M:%S")
        log_entry = {
            "timestamp": now_time,
            "phase": phase,
            "phase_number": phase_num,
            "message": message,
            "full_log": f"{now_time} {message}"
        }
        DEMO_STATE["logs"].append(log_entry)
        DEMO_STATE["current_phase"] = phase
        DEMO_STATE["phase_number"] = phase_num

        ws_payload = {
            "event": "DEMO_EVENT",
            "phase": phase,
            "phase_number": phase_num,
            "log_entry": log_entry,
            "data": payload or {}
        }
        try:
            await ws_manager.broadcast(ws_payload)
        except Exception:
            pass

    @staticmethod
    async def run_live_demo(db: Session):
        if DEMO_STATE["is_running"]:
            return {"status": "ALREADY_RUNNING"}

        DEMO_STATE["is_running"] = True
        DEMO_STATE["logs"] = []
        DEMO_STATE["last_run_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # ----------------------------------------------------
            # PHASE 1: NORMAL TRAFFIC
            # ----------------------------------------------------
            await DemoOrchestrator.broadcast_event(
                phase="PHASE 1: NORMAL TRAFFIC",
                phase_num=1,
                message="Transaction received",
                payload={"tx_id": "tx_normal_101", "amount": 45.00, "status": "APPROVED", "risk": 12.5}
            )
            await asyncio.sleep(1.2)

            await DemoOrchestrator.broadcast_event(
                phase="PHASE 1: NORMAL TRAFFIC",
                phase_num=1,
                message="Normal benign user traffic active across 3 merchant categories",
                payload={"active_merchants": 3, "avg_risk": 14.2}
            )
            await asyncio.sleep(1.5)

            # ----------------------------------------------------
            # PHASE 2: ATTACK BEGINS
            # ----------------------------------------------------
            await DemoOrchestrator.broadcast_event(
                phase="PHASE 2: ATTACK BEGINS",
                phase_num=2,
                message="New account cluster detected",
                payload={"accounts_created": 8, "time_window": "30 seconds", "promo_coupon": "WELCOME50"}
            )
            await asyncio.sleep(1.2)

            await DemoOrchestrator.broadcast_event(
                phase="PHASE 2: ATTACK BEGINS",
                phase_num=2,
                message="Shared device detected",
                payload={"device_id": "dev_stealth_c91_primary", "shared_across_accounts": 14, "ip_proxy": "ip_stealth_c91_proxy"}
            )
            await asyncio.sleep(1.5)

            # ----------------------------------------------------
            # PHASE 3: ATTACK DETECTED
            # ----------------------------------------------------
            cluster = NetworkRiskEngine.evaluate_attack_cluster(
                db=db,
                cluster_id="cls_c91_stealth_ring",
                cluster_name="ATTACK CLUSTER #C91 (Sybil Proxy Ring)",
                entity_type="device",
                entity_id="dev_stealth_c91_primary"
            )

            await DemoOrchestrator.broadcast_event(
                phase="PHASE 3: ATTACK DETECTED",
                phase_num=3,
                message="Attack cluster formed",
                payload={
                    "cluster_id": cluster.cluster_id,
                    "risk_score": cluster.final_combined_risk,
                    "affected_accounts": cluster.affected_accounts,
                    "pattern": cluster.pattern_type
                }
            )
            await asyncio.sleep(1.2)

            candidates = ContainmentOptimizer.evaluate_containment_options(cluster)
            rec = candidates[0] if candidates else None

            await DemoOrchestrator.broadcast_event(
                phase="PHASE 3: ATTACK DETECTED",
                phase_num=3,
                message="Containment recommended",
                payload={
                    "recommended_action": rec.action if rec else "QUARANTINE_DEVICE",
                    "target": rec.target_id if rec else "dev_stealth_c91_primary",
                    "coverage": rec.coverage_percentage if rec else 86.8,
                    "est_loss_prevented": rec.estimated_loss_prevented if rec else 635.68
                }
            )
            await asyncio.sleep(1.5)

            # ----------------------------------------------------
            # PHASE 4: ATTACK CONTAINED & COUNTERFACTUAL
            # ----------------------------------------------------
            action_log = ContainmentOptimizer.execute_containment_action(
                db=db,
                cluster_id=cluster.cluster_id,
                action=rec.action if rec else "QUARANTINE_DEVICE",
                target_id=rec.target_id if rec else "dev_stealth_c91_primary",
                reason="SIMULATED DEMO: Disrupted network choke point"
            )

            await DemoOrchestrator.broadcast_event(
                phase="PHASE 4: ATTACK CONTAINED",
                phase_num=4,
                message="Device quarantined",
                payload={"action": action_log.action, "target": action_log.target, "log_id": action_log.id}
            )
            await asyncio.sleep(1.2)

            counterfactual = CounterfactualSimulator.simulate_attack_trajectories(cluster)

            await DemoOrchestrator.broadcast_event(
                phase="PHASE 4: ATTACK CONTAINED",
                phase_num=4,
                message="Attack contained",
                payload={
                    "status": "CONTAINED",
                    "without_riskgraph_txs": counterfactual.without_riskgraph["transactions_exposed"],
                    "without_riskgraph_inr": counterfactual.without_riskgraph["display_amount_inr"],
                    "with_riskgraph_txs": counterfactual.with_riskgraph["transactions_intercepted"],
                    "with_riskgraph_inr": counterfactual.with_riskgraph["display_amount_inr"],
                    "counterfactual_disclaimer": counterfactual.disclaimer
                }
            )

            DEMO_STATE["demo_data"] = {
                "cluster": cluster.dict(),
                "containment": rec.dict() if rec else {},
                "counterfactual": counterfactual.dict()
            }

        finally:
            DEMO_STATE["is_running"] = False

        return {"status": "SUCCESS", "logs_count": len(DEMO_STATE["logs"])}
