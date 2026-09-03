import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.modules.graph.engine import build_subgraph_for_entity, get_transaction_investigation
from app.models.domain import Transaction

def test_graph_engine():
    db = SessionLocal()
    try:
        sample_tx = db.query(Transaction).first()
        if not sample_tx:
            print("No transactions found")
            return

        tx_id = sample_tx.id
        print(f"Testing graph generation for tx_id={tx_id}...")

        investigation = get_transaction_investigation(db, tx_id)
        graph = investigation.graph_data

        print(f"Nodes count: {len(graph.nodes)}")
        print(f"Edges count: {len(graph.edges)}")
        print(f"Network Risk Score: {graph.network_risk_score}")
        print(f"Network Signals: {graph.network_signals.model_dump() if graph.network_signals else None}")

        # Test device graph
        if sample_tx.device_id:
            dev_nodes, dev_edges, dev_metrics = build_subgraph_for_entity(db, "device", sample_tx.device_id)
            print(f"Device graph dev_{sample_tx.device_id}: {len(dev_nodes)} nodes, {len(dev_edges)} edges")
            print(f"Device signals: {dev_metrics.get('network_signals').model_dump() if dev_metrics.get('network_signals') else None}")

        # Test customer graph
        if sample_tx.customer_id:
            cust_nodes, cust_edges, cust_metrics = build_subgraph_for_entity(db, "customer", sample_tx.customer_id)
            print(f"Customer graph cust_{sample_tx.customer_id}: {len(cust_nodes)} nodes, {len(cust_edges)} edges")

        print("\nBACKEND STEP 4 GRAPH ENGINE: SUCCESS!")

    finally:
        db.close()

if __name__ == "__main__":
    test_graph_engine()
