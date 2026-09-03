import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.modules.investigations.agent import InvestigationAgent

def run_investigation_tests():
    print("--- STARTING STEP 8 AI INVESTIGATION AGENT VALIDATION ---")
    db = SessionLocal()

    # TEST 1: Valid Investigation & Evidence Citations
    print("\n[TEST 1] Testing AI Investigation Report Generation for 'tx_stealth_01'")
    report = InvestigationAgent.run_investigation(db, "tx_stealth_01")
    print(f"Summary: {report.summary[:100]}...")
    print(f"Evidence Count: {len(report.evidence)}")
    print(f"Attack Pattern: {report.attack_pattern}")
    print(f"Confidence: {report.confidence}")
    
    assert report.evidence, "Investigation failed to extract evidence citations"
    assert "dev_stealth_c91_primary" in str(report.evidence) or "dev_stealth_c91_primary" in str(report.summary), "Evidence missed exact device ID citation"
    print("[OK] Evidence citation test passed. Found exact device ID and transaction linkages.")

    # TEST 2: Missing Data Handling
    print("\n[TEST 2] Testing Graceful Missing Data Handling for non-existent ID 'tx_non_existent_999'")
    missing_report = InvestigationAgent.run_investigation(db, "tx_non_existent_999")
    print(f"Summary: {missing_report.summary}")
    assert missing_report.confidence == 0.0, "Confidence should be 0.0 for non-existent transactions"
    assert len(missing_report.evidence) == 0, "Missing data should not invent fake evidence"
    print("[OK] Graceful missing data handling test passed.")

    # TEST 3: Q&A Follow-Up Chat Engine Grounded in Tools
    print("\n[TEST 3] Testing Interactive Chat Engine Follow-Up Q&A")
    chat_resp = InvestigationAgent.answer_chat_question(db, "tx_stealth_01", "Why is this transaction risky?")
    print(f"Answer: {chat_resp.answer}")
    print(f"Citations: {chat_resp.citations}")
    assert chat_resp.citations, "Chat response missing tool evidence citations"
    print("[OK] Interactive chat Q&A successfully grounded in tools.")

    db.close()
    print("\n--- ALL STEP 8 AI INVESTIGATION AGENT TESTS PASSED ---")

if __name__ == "__main__":
    run_investigation_tests()
