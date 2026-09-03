import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.domain import Transaction, Merchant, Customer, Device, IPAddress, PaymentMethod

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed test data for graph testing if empty
        if db.query(Merchant).count() == 0:
            mch = Merchant(id="mch_test_1", name="Test Merchant", category="RETAIL")
            cust1 = Customer(id="cust_test_1", email_domain="gmail.com")
            cust2 = Customer(id="cust_test_2", email_domain="gmail.com")
            dev = Device(id="dev_shared_1", fingerprint_hash="hash123", device_type="DESKTOP", os_name="WINDOWS")
            ip = IPAddress(id="ip_shared_1", ip_address="192.168.1.100", country_code="USA")
            pm = PaymentMethod(id="pm_test_1", card_hash="cardhash1", card_bin="411111")

            db.add_all([mch, cust1, cust2, dev, ip, pm])
            db.commit()

            tx1 = Transaction(
                id="tx_graph_1", merchant_id="mch_test_1", customer_id="cust_test_1",
                device_id="dev_shared_1", ip_id="ip_shared_1", payment_method_id="pm_test_1",
                amount=500.0, status="APPROVED", is_fraud=False
            )
            tx2 = Transaction(
                id="tx_graph_2", merchant_id="mch_test_1", customer_id="cust_test_2",
                device_id="dev_shared_1", ip_id="ip_shared_1", payment_method_id="pm_test_1",
                amount=1200.0, status="DECLINED", is_fraud=True
            )
            db.add_all([tx1, tx2])
            db.commit()

        yield db
    finally:
        db.close()


def test_get_entity_subgraph_endpoint(db_session):
    response = client.get("/api/v1/graph/entity/dev_shared_1?entity_type=device")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "network_risk_score" in data
    assert isinstance(data["nodes"], list)
    assert len(data["nodes"]) > 0


def test_get_attack_clusters_endpoint(db_session):
    response = client.get("/api/v1/graph/clusters")
    assert response.status_code == 200
    clusters = response.json()
    assert isinstance(clusters, list)
    assert len(clusters) > 0
    first = clusters[0]
    assert "cluster_id" in first
    assert "pattern_type" in first
    assert "network_risk_score" in first


def test_get_cluster_detail_endpoint(db_session):
    # First get clusters list
    resp = client.get("/api/v1/graph/clusters")
    clusters = resp.json()
    cluster_id = clusters[0]["cluster_id"]

    detail_resp = client.get(f"/api/v1/graph/clusters/{cluster_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["cluster_id"] == cluster_id
    assert "nodes" in detail


def test_transaction_investigation_endpoint(db_session):
    response = client.get("/api/v1/graph/transaction/tx_graph_1")
    assert response.status_code == 200
    data = response.json()
    assert data["transaction_id"] == "tx_graph_1"
    assert "individual_risk_score" in data
    assert "network_risk_score" in data
    assert "traversal_breakdown" in data
    assert "graph_data" in data
