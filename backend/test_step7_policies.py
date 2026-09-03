import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.modules.policies.engine import PolicyEngine
from app.modules.attacks.schemas import AttackCluster

def run_policy_engine_test():
    print("--- STARTING POLICY ENGINE VALIDATION ---")
    db = SessionLocal()
    
    # We will simulate a small cluster trying to quarantine a device.
    # Default policy device_quarantine_threshold = 8
    
    mock_cluster_small = AttackCluster(
        cluster_id="cls_test_small",
        cluster_name="Small Test Ring",
        status="CONFIRMED",
        severity="MEDIUM",
        pattern_type="COORDINATED_FRAUD_RING",
        affected_accounts=5, # < 8
        affected_devices=1,
        affected_ips=1,
        affected_merchants=1,
        affected_cards=1,
        node_count=10,
        edge_count=12,
        transaction_count=10,
        network_risk_score=90.0,
        individual_risk_avg=40.0,
        final_combined_risk=90.0,
        risk_reasons=[]
    )
    
    print("\n[TEST 1] Testing Device Quarantine on Small Cluster (Accounts < Threshold)")
    eval_1 = PolicyEngine.evaluate_action(db, "QUARANTINE_DEVICE", "dev_test", mock_cluster_small)
    print(f"Result: Allowed = {eval_1.is_allowed}")
    print(f"Reason: {eval_1.reason}")
    assert eval_1.is_allowed == False, "Policy Engine failed to block automated device quarantine on small cluster"
    print("[OK] Policy successfully intercepted unsafe containment action.")
    
    mock_cluster_large = AttackCluster(
        cluster_id="cls_test_large",
        cluster_name="Large Test Ring",
        status="CONFIRMED",
        severity="CRITICAL",
        pattern_type="COORDINATED_FRAUD_RING",
        affected_accounts=15, # > 8
        affected_devices=1,
        affected_ips=1,
        affected_merchants=1,
        affected_cards=1,
        node_count=30,
        edge_count=40,
        transaction_count=30,
        network_risk_score=95.0,
        individual_risk_avg=50.0,
        final_combined_risk=95.0,
        risk_reasons=[]
    )
    
    print("\n[TEST 2] Testing Device Quarantine on Large Cluster (Accounts > Threshold)")
    eval_2 = PolicyEngine.evaluate_action(db, "QUARANTINE_DEVICE", "dev_test", mock_cluster_large)
    print(f"Result: Allowed = {eval_2.is_allowed}")
    print(f"Reason: {eval_2.reason}")
    assert eval_2.is_allowed == True, "Policy Engine incorrectly blocked valid quarantine action"
    print("[OK] Policy allowed safe automated containment.")

    db.close()
    print("\n--- ALL POLICY ENGINE TESTS PASSED ---")

if __name__ == "__main__":
    run_policy_engine_test()
