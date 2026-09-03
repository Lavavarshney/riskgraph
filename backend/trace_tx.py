import sys
import json
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.domain import Transaction
from app.modules.risk.features import extract_features_from_dict, format_feature_dataframe
from app.modules.risk.trainer import RiskScoringEngine

sqlite_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../riskgraph.db"))
engine = create_engine(f"sqlite:///{sqlite_db_path}")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

tx = db.query(Transaction).order_by(Transaction.timestamp.desc()).first()

if not tx:
    print("No transactions found.")
    sys.exit(0)

raw_dict = {
    "id": tx.id,
    "merchant_id": tx.merchant_id,
    "customer_id": tx.customer_id,
    "device_id": tx.device_id,
    "ip_id": tx.ip_id,
    "payment_method_id": tx.payment_method_id,
    "amount": float(tx.amount),
    "currency": tx.currency,
    "timestamp": tx.timestamp.isoformat(),
    "status": tx.status,
    "payment_attempt_number": tx.payment_attempt_number,
    "failed_attempts_recent": tx.failed_attempts_recent,
    "account_age_minutes": tx.account_age_minutes,
    "country": tx.country,
    "is_fraud": tx.is_fraud,
    "fraud_type": tx.fraud_type,
    "coupon_id": tx.coupon_id
}

print("=== 1. RAW TRANSACTION (From PostgreSQL) ===")
print(json.dumps(raw_dict, indent=2))

features = extract_features_from_dict(raw_dict)
print("\n=== 2. FEATURE EXTRACTION ===")
print(json.dumps(features, indent=2))

engine = RiskScoringEngine.get_instance()
df_feat = format_feature_dataframe(features)
print("\n=== 3. FEATURE VECTOR (DataFrame shape) ===")
print(df_feat.shape)
print(df_feat.to_dict('records')[0])

res = engine.predict(raw_dict)

print("\n=== 4. XGBOOST PREDICTION & PROBABILITY ===")
print(f"Fraud Probability: {res['fraud_probability']}")

print("\n=== 5. RISK SCORE ===")
print(f"Risk Score (0-100): {res['risk_score']}")
print("Top SHAP Reasons:", res['top_reasons'])

print("\n=== 6. DECISION ===")
print(f"Decision: {res['decision']}")
