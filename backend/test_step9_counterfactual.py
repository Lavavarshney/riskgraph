import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.modules.attacks.counterfactual import CounterfactualSimulator
from app.modules.attacks.engine import NetworkRiskEngine

def run_counterfactual_tests():
    print("--- STARTING STEP 9 COUNTERFACTUAL ATTACK SIMULATOR VALIDATION ---")
    db = SessionLocal()

    # TEST 1: Calculate counterfactual scenarios for stealth cluster
    print("\n[TEST 1] Testing Counterfactual Simulation for '#C91' Stealth Ring")
    cluster = NetworkRiskEngine.evaluate_attack_cluster(
        db=db,
        cluster_id="cls_c91_stealth_ring",
        cluster_name="ATTACK CLUSTER #C91 (Sybil Proxy Ring)",
        entity_type="device",
        entity_id="dev_stealth_c91_primary"
    )

    scenario = CounterfactualSimulator.simulate_attack_trajectories(cluster)
    
    print(f"Disclaimer: {scenario.disclaimer}")
    print(f"Scenario A (Without RiskGraph): {scenario.without_riskgraph['transactions_exposed']} txs | {scenario.without_riskgraph['display_amount_inr']}")
    print(f"Scenario B (With RiskGraph): {scenario.with_riskgraph['transactions_intercepted']} txs | {scenario.with_riskgraph['display_amount_inr']}")
    print(f"Timeline Points Count: {len(scenario.timeline)}")

    # Assertions
    assert "Simulated counterfactual" in scenario.disclaimer, "Disclaimer label missing or incorrect!"
    assert scenario.without_riskgraph['transactions_exposed'] > scenario.with_riskgraph['transactions_intercepted'], "Scenario A projected transactions must exceed Scenario B intercepted transactions!"
    assert scenario.without_riskgraph['transactions_exposed'] == 126, "Scenario A transactions exposed should project 126 transactions"
    assert scenario.without_riskgraph['display_amount_inr'] == "₹4.8L", "Scenario A exposure display string mismatch"
    assert scenario.with_riskgraph['display_amount_inr'] == "₹84K", "Scenario B protected display string mismatch"
    assert len(scenario.timeline) == 6, "Timeline must contain 6 projection steps (T+0m to T+45m)"

    print("[OK] All counterfactual metric assertions passed.")
    db.close()
    print("\n--- ALL STEP 9 COUNTERFACTUAL SIMULATOR TESTS PASSED ---")

if __name__ == "__main__":
    run_counterfactual_tests()
