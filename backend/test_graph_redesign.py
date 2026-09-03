import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.modules.graph.engine import build_subgraph_for_entity, get_transaction_investigation, get_entity_summary, expand_entity_subgraph
from app.models.domain import Transaction

def test_graph_redesign():
    db = SessionLocal()
    try:
        sample_tx = db.query(Transaction).first()
        if not sample_tx:
            print("No transactions found")
            return

        tx_id = f"tx_{sample_tx.id}"
        print(f"--- 1. Testing Initial Small Graph for {tx_id} ---")
        inv = get_transaction_investigation(db, sample_tx.id)
        nodes = inv.graph_data.nodes
        edges = inv.graph_data.edges
        print(f"Initial nodes count: {len(nodes)} (Expected 6-10)")
        print(f"Initial edges count: {len(edges)}")
        assert len(nodes) <= 12, f"Initial graph node count {len(nodes)} exceeds max initial threshold!"

        print(f"\n--- 2. Testing Entity Summary API for device {sample_tx.device_id} ---")
        summary = get_entity_summary(db, "device", sample_tx.device_id)
        print(f"Summary: {summary}")
        assert "connected_customers" in summary
        assert "connected_transactions" in summary
        assert "fraud_transactions" in summary

        print(f"\n--- 3. Testing Relevance-Ranked Expansion API for device {sample_tx.device_id} ---")
        expanded = expand_entity_subgraph(db, "device", sample_tx.device_id, limit=10)
        print(f"Expanded nodes count: {len(expanded['nodes'])} (Limit 10)")
        print(f"Expanded edges count: {len(expanded['edges'])}")
        assert len(expanded['nodes']) <= 10, "Expansion exceeded requested limit!"

        print("\nGRAPH REDESIGN VERIFICATION: ALL ASSERIONS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_graph_redesign()
