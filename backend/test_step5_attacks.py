import sys
import os

sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.modules.attacks.engine import NetworkRiskEngine
from app.modules.attacks.router import get_active_attacks

def test_step5_attack_detection():
    print("==================================================")
    print("STEP 5 — COORDINATED ATTACK DETECTION VALIDATION")
    print("==================================================")

    # 1. Test transparent non-linear scoring combination formula
    print("\n--- 1. Testing Unified Non-Linear Scoring Formula ---")
    # Low individual risk (30), high network risk (92), cluster size 14
    comb = NetworkRiskEngine.combine_risk_scores(
        transaction_risk=30.0,
        behavioral_risk=25.0,
        network_risk=92.0,
        cluster_size=14
    )
    print(f"Input: Tx Risk=30.0, Behavioral Risk=25.0, Network Risk=92.0, Cluster Size=14 accounts")
    print(f"Formula: min(100, max(30, 25)*0.35 + 92*0.65 + cluster_amp)")
    print(f"Result: Final Risk = {comb.final_risk_score}/100 ({comb.decision})")
    print(f"Explanation: {comb.explanation}")

    assert comb.final_risk_score >= 80.0, "Escalation failed: low individual + high network must be >= 80"
    print("[OK] Formula Escalation Passed!")

    # 2. Test Attack States
    print("\n--- 2. Testing Attack State Transitions ---")
    assert NetworkRiskEngine.determine_attack_state(25.0) == "NORMAL"
    assert NetworkRiskEngine.determine_attack_state(45.0) == "EMERGING"
    assert NetworkRiskEngine.determine_attack_state(70.0) == "SUSPECTED"
    assert NetworkRiskEngine.determine_attack_state(90.0) == "CONFIRMED"
    assert NetworkRiskEngine.determine_attack_state(90.0, is_contained=True) == "CONTAINED"
    print("[OK] Attack Lifecycle States Passed!")

    # 3. Test Active Attack Discovery from PostgreSQL
    print("\n--- 3. Testing PostgreSQL Active Attack Discovery ---")
    db = SessionLocal()
    try:
        clusters = get_active_attacks(limit=10, db=db)
        print(f"Discovered {len(clusters)} Active Attack Cluster(s):")
        
        for idx, c in enumerate(clusters, 1):
            print(f"\n[{idx}] {c.cluster_name} ({c.cluster_id})")
            print(f"    Status: {c.status} | Severity: {c.severity} | Pattern: {c.pattern_type}")
            print(f"    Final Risk Score: {c.final_combined_risk}/100 (Network: {c.network_risk_score}, Indiv Avg: {c.individual_risk_avg})")
            print(f"    Entities: {c.affected_accounts} Accounts | {c.affected_devices} Devices | {c.affected_ips} IPs | {c.transaction_count} Txs")
            print(f"    Graph Topology: {c.node_count} Nodes, {c.edge_count} Edges")
            print(f"    Top Reasons:")
            for r in c.risk_reasons[:3]:
                print(f"      - {r}")

        assert len(clusters) > 0, "No active attack clusters discovered"
        c0 = clusters[0]
        assert c0.final_combined_risk >= 80.0, "Cluster 0 final combined risk must be >= 80"
        print("\n[OK] Active Attack Cluster Discovery & Graph Analysis Passed!")

    finally:
        db.close()

if __name__ == "__main__":
    test_step5_attack_detection()
