import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.modules.graph.engine import get_transaction_investigation, get_entity_summary, expand_entity_subgraph
from app.models.domain import Transaction

def test_tx5():
    db = SessionLocal()
    try:
        tx5 = db.query(Transaction).filter(Transaction.id == "5").first()
        if not tx5:
            tx5 = db.query(Transaction).offset(4).first()

        if not tx5:
            print("No transaction found")
            return

        tx_id = tx5.id
        print(f"Targeting Transaction ID: {tx_id}")

        inv = get_transaction_investigation(db, tx_id)
        nodes = inv.graph_data.nodes
        print(f"Initial nodes for tx_{tx_id}: {len(nodes)}")
        for n in nodes:
            print(f" - [{n.type}] {n.id}: {n.label}")

        print(f"\nIndividual Risk: {inv.individual_risk_score}/100 ({inv.individual_decision})")
        print(f"Network Risk: {inv.network_risk_score}/100 ({inv.network_decision})")

        # Test expand on device
        if tx5.device_id:
            exp_dev = expand_entity_subgraph(db, "device", tx5.device_id, limit=10)
            print(f"\nExpanded device dev_{tx5.device_id}: {len(exp_dev['nodes'])} nodes")
            for n in exp_dev['nodes']:
                print(f"   + [{n.type}] {n.id}: {n.label}")

        # Test summary on device
        if tx5.device_id:
            summary_dev = get_entity_summary(db, "device", tx5.device_id)
            print(f"\nDevice Summary dev_{tx5.device_id}: {summary_dev}")

    finally:
        db.close()

if __name__ == "__main__":
    test_tx5()
