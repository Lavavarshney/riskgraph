import os
import sys
import asyncio

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.modules.demo.engine import DemoOrchestrator, DEMO_STATE

async def run_demo_tests():
    print("--- STARTING STEP 10 LIVE ATTACK DEMO MODE VALIDATION ---")
    db = SessionLocal()

    print("\n[TEST 1] Triggering DemoOrchestrator 4-phase live pipeline...")
    res = await DemoOrchestrator.run_live_demo(db)
    
    print(f"Pipeline Result: {res['status']}")
    print(f"Total Log Events Generated: {res['logs_count']}")

    assert res['status'] == "SUCCESS", "Demo orchestrator failed to complete pipeline"
    assert len(DEMO_STATE["logs"]) >= 7, "Demo log count is less than expected 7 phase events"

    # Verify event sequence
    messages = [log["message"] for log in DEMO_STATE["logs"]]
    print("\n[TEST 2] Verifying Timeline Log Sequence:")
    for msg in messages:
        print(f"  ✓ {msg}")

    assert "Transaction received" in messages, "Phase 1 event missing"
    assert "New account cluster detected" in messages, "Phase 2 event missing"
    assert "Shared device detected" in messages, "Phase 2 event missing"
    assert "Attack cluster formed" in messages, "Phase 3 event missing"
    assert "Containment recommended" in messages, "Phase 3 event missing"
    assert "Device quarantined" in messages, "Phase 4 event missing"
    assert "Attack contained" in messages, "Phase 4 event missing"

    print("\n[OK] All 4 backend phases & timeline log assertions passed.")
    db.close()
    print("\n--- ALL STEP 10 LIVE ATTACK DEMO TESTS PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_demo_tests())
