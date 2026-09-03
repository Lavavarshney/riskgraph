from typing import Dict, Any, List
import pandas as pd
import numpy as np

FEATURE_NAMES = [
    "amount",
    "account_age_minutes",
    "failed_attempts_recent",
    "transactions_last_1m",
    "transactions_last_5m",
    "transactions_last_10m",
    "time_since_previous_transaction",
    "device_account_count",
    "ip_account_count",
    "payment_method_age",
    "country_change",
    "average_customer_amount",
    "amount_deviation_from_customer_history",
    "refund_count",
    "coupon_usage_count"
]

# Human-readable labels mapped to feature names for SHAP explanation rendering
FEATURE_REASON_LABELS = {
    "amount": "High transaction amount",
    "account_age_minutes": "Very new customer account",
    "failed_attempts_recent": "Multiple recent failed payment attempts",
    "transactions_last_1m": "Extreme transaction velocity (1m window)",
    "transactions_last_5m": "High transaction velocity (5m window)",
    "transactions_last_10m": "Elevated transaction velocity (10m window)",
    "time_since_previous_transaction": "Rapid successive transaction timing",
    "device_account_count": "Device linked to multiple customer accounts",
    "ip_account_count": "IP address shared across multiple accounts",
    "payment_method_age": "Newly registered payment method",
    "country_change": "Country mismatch between IP and issuer country",
    "average_customer_amount": "Customer historical spending pattern outlier",
    "amount_deviation_from_customer_history": "Unusual amount deviation from customer baseline",
    "refund_count": "History of high refund requests",
    "coupon_usage_count": "High promotional coupon redemptions"
}

from datetime import datetime, timedelta

def extract_features_from_dict(data: Dict[str, Any], db=None) -> Dict[str, float]:
    """
    Extracts the 15 transaction-level features from a raw dictionary or payment payload.
    If 'db' is provided, it dynamically calculates historical features using only transactions
    prior to the current transaction's timestamp to prevent temporal leakage.
    """
    amount = float(data.get("amount", 50.0))
    tx_timestamp = data.get("timestamp")
    if not tx_timestamp:
        tx_timestamp = datetime.utcnow()
    elif isinstance(tx_timestamp, str):
        tx_timestamp = datetime.fromisoformat(tx_timestamp.replace("Z", "+00:00"))

    cust_id = data.get("customer_id")
    dev_id = data.get("device_id")
    ip_id = data.get("ip_id")

    # Default values
    avg_amount = float(data.get("average_customer_amount", amount))
    transactions_last_1m = float(data.get("transactions_last_1m", 0.0))
    transactions_last_5m = float(data.get("transactions_last_5m", 0.0))
    transactions_last_10m = float(data.get("transactions_last_10m", 0.0))
    time_since_previous = float(data.get("time_since_previous_transaction", 86400.0))
    dev_acc_count = float(data.get("device_account_count", 1.0))
    ip_acc_count = float(data.get("ip_account_count", 1.0))

    if db and cust_id:
        from app.models.domain import Transaction
        from sqlalchemy import func

        # 1. Historical aggregations (timestamp < tx_timestamp)
        # Average customer amount
        avg_res = db.query(func.avg(Transaction.amount)).filter(
            Transaction.customer_id == cust_id,
            Transaction.timestamp < tx_timestamp,
            Transaction.status == "APPROVED"
        ).scalar()
        if avg_res is not None:
            avg_amount = float(avg_res)

        # Velocity
        ten_mins_ago = tx_timestamp - timedelta(minutes=10)
        recent_txs = db.query(Transaction.timestamp).filter(
            Transaction.customer_id == cust_id,
            Transaction.timestamp >= ten_mins_ago,
            Transaction.timestamp < tx_timestamp
        ).order_by(Transaction.timestamp.desc()).all()
        
        if recent_txs:
            time_since_previous = (tx_timestamp - recent_txs[0][0]).total_seconds()
            
            transactions_last_10m = float(len(recent_txs))
            five_mins_ago = tx_timestamp - timedelta(minutes=5)
            one_min_ago = tx_timestamp - timedelta(minutes=1)
            
            transactions_last_5m = float(sum(1 for t in recent_txs if t[0] >= five_mins_ago))
            transactions_last_1m = float(sum(1 for t in recent_txs if t[0] >= one_min_ago))

    if db and dev_id:
        from app.models.domain import Transaction
        from sqlalchemy import func
        res = db.query(func.count(func.distinct(Transaction.customer_id))).filter(
            Transaction.device_id == dev_id,
            Transaction.timestamp < tx_timestamp
        ).scalar()
        if res and res > 0:
            dev_acc_count = float(res)

    if db and ip_id:
        from app.models.domain import Transaction
        from sqlalchemy import func
        res = db.query(func.count(func.distinct(Transaction.customer_id))).filter(
            Transaction.ip_id == ip_id,
            Transaction.timestamp < tx_timestamp
        ).scalar()
        if res and res > 0:
            ip_acc_count = float(res)

    if avg_amount <= 0:
        avg_amount = amount

    amount_dev = abs(amount - avg_amount) / (avg_amount + 1e-5)

    # Use basic logic for the rest, completely omitting fraud_type
    coupon_usage_count = float(data.get("coupon_usage_count", 1.0 if data.get("coupon_id") else 0.0))
    country_change = float(data.get("country_change", 1.0 if data.get("country") in ["NGA", "ROU", "RUS"] else 0.0))

    return {
        "amount": amount,
        "account_age_minutes": float(data.get("account_age_minutes", 1440)),
        "failed_attempts_recent": float(data.get("failed_attempts_recent", 0)),
        "transactions_last_1m": transactions_last_1m,
        "transactions_last_5m": transactions_last_5m,
        "transactions_last_10m": transactions_last_10m,
        "time_since_previous_transaction": time_since_previous,
        "device_account_count": dev_acc_count,
        "ip_account_count": ip_acc_count,
        "payment_method_age": float(data.get("payment_method_age", 45.0)),
        "country_change": country_change,
        "average_customer_amount": avg_amount,
        "amount_deviation_from_customer_history": float(data.get("amount_deviation_from_customer_history", amount_dev)),
        "refund_count": float(data.get("refund_count", 0)),
        "coupon_usage_count": coupon_usage_count
    }

def format_feature_dataframe(feature_dict: Dict[str, float]) -> pd.DataFrame:
    """Formats feature dictionary into a 1-row DataFrame aligned with FEATURE_NAMES."""
    return pd.DataFrame([[feature_dict[name] for name in FEATURE_NAMES]], columns=FEATURE_NAMES)
