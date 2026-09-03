import sys
import os

sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.domain import ActionLog
from app.modules.attacks.router import get_active_attacks, get_containment_options
from app.modules.containment.engine import ContainmentOptimizer

def test_step6_fraud_containment_optimizer():
    print("==================================================")
    print("STEP 6 — FRAUD CONTAINMENT OPTIMIZER VALIDATION")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Fetch active cluster
        clusters = get_active_attacks(limit=5, db=db)
        assert len(clusters) > 0, "No active clusters found"
        target_cluster = clusters[0]
        print(f"\n[+] Analyzing Cluster: {target_cluster.cluster_name} ({target_cluster.cluster_id})")

        # 2. Evaluate containment candidates using ContainmentOptimizer
        options = ContainmentOptimizer.evaluate_containment_options(target_cluster)
        print(f"\n--- 1. Containment Candidate Ranking ({len(options)} Options) ---")
        
        for idx, opt in enumerate(options, 1):
            rec_str = " [RECOMMENDED]" if opt.is_recommended else ""
            print(f"[{idx}] {opt.action} -> {opt.target_label}{rec_str}")
            print(f"    Coverage: {opt.coverage_percentage}% ({opt.transactions_affected} transactions affected)")
            print(f"    Est Loss Prevented: ${opt.estimated_loss_prevented:.2f} | Collateral Risk: {opt.collateral_risk}")
            print(f"    Operational Cost: {opt.operational_cost}")
            print(f"    Reason: {opt.reason}")

        assert len(options) > 0, "No containment candidates generated"
        recommended = options[0]
        assert recommended.is_recommended is True, "Top candidate must be marked as is_recommended=True"
        assert recommended.action in ("QUARANTINE_DEVICE", "QUARANTINE_IP", "DISABLE_COUPON"), "Top choke point action must target shared infrastructure over individual blocks"
        print("\n[OK] Choke Point Algorithm & Recommendation Passed!")

        # 3. Execute containment simulation & write to ActionLog
        print("\n--- 2. Executing Containment & Action Ledger Persistence ---")
        action_record = ContainmentOptimizer.execute_containment_action(
            db=db,
            cluster_id=target_cluster.cluster_id,
            action=recommended.action,
            target_id=recommended.target_id,
            reason=recommended.reason
        )
        print(f"Action Recorded: ID={action_record.id} | Action={action_record.action} | Target={action_record.target}")

        # 4. Verify ActionLog persistence in PostgreSQL
        db_log = db.query(ActionLog).filter(ActionLog.id == action_record.id).first()
        assert db_log is not None, "ActionLog entry was not persisted to PostgreSQL database"
        assert db_log.cluster_id == target_cluster.cluster_id, "Cluster ID mismatch in ActionLog"
        assert db_log.result == "SUCCESS", "Result must be SUCCESS"
        print("[OK] Immutable Action Log Persistence Verified in PostgreSQL!")

        print("\n==================================================")
        print("STEP 6 VALIDATION COMPLETE — ALL TESTS PASSED!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_step6_fraud_containment_optimizer()
