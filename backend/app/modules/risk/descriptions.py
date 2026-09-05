def generate_transaction_description(tx_data: dict, risk_signals: dict, graph_metrics: dict) -> str:
    fraud_type = tx_data.get("fraud_type", "DEFAULT")
    amount = tx_data.get("amount", 0.0)
    failed_attempts_recent = tx_data.get("failed_attempts_recent", 0)
    account_age_minutes = tx_data.get("account_age_minutes", 0)
    country = tx_data.get("country", "Unknown")
    device_id = tx_data.get("device_id", "Unknown")

    device_account_count = risk_signals.get("device_account_count", 1)
    ip_account_count = risk_signals.get("ip_account_count", 1)
    
    customer_count = graph_metrics.get("customer_count", 1)
    fraud_transaction_count = graph_metrics.get("fraud_transaction_count", 0)
    device_count = graph_metrics.get("device_count", 1)
    ip_count = graph_metrics.get("ip_count", 1)

    if fraud_type == "CARD_TESTING":
        return f"Card testing detected: {failed_attempts_recent} failed payment attempts in recent window. Transaction amount ${amount} is consistent with card validation probing. Device {device_id} has been used across {device_account_count} accounts."
    elif fraud_type == "ACCOUNT_FARM":
        return f"Synthetic account farm activity: Account created {account_age_minutes} minutes ago. Device shared across {device_account_count} customer accounts. IP address linked to {ip_account_count} accounts. Network contains {customer_count} connected customers."
    elif fraud_type == "ACCOUNT_TAKEOVER":
        return f"Account takeover indicators: Transaction from {country} using device linked to {device_account_count} accounts. Amount ${amount} with {failed_attempts_recent} recent failed attempts. Account age: {account_age_minutes} minutes."
    elif fraud_type in ("FRAUD_RING", "STEALTH_RING", "COORDINATED_FRAUD_RING"):
        return f"Coordinated fraud ring detected: {customer_count} connected customer accounts sharing {device_count} devices and {ip_count} IP addresses. Network contains {fraud_transaction_count} confirmed fraudulent transactions."
    elif fraud_type == "COUPON_ABUSE":
        return f"Coupon abuse pattern: {customer_count} accounts with shared infrastructure. Device linked to {device_account_count} accounts. {fraud_transaction_count} fraud-flagged transactions in network."
    else:
        return f"General risk pattern detected: Amount ${amount} from {country}. Network contains {customer_count} connected customers and {fraud_transaction_count} historical fraudulent transactions."
