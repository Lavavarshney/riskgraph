from app.modules.risk.trainer import RiskScoringEngine

engine = RiskScoringEngine.get_instance()

normal_sample = {
    "id": "tx_normal_1",
    "amount": 42.50,
    "account_age_minutes": 25000,
    "failed_attempts_recent": 0,
    "fraud_type": "NORMAL"
}

fraud_sample = {
    "id": "tx_card_testing_99",
    "amount": 1450.00,
    "account_age_minutes": 5,
    "failed_attempts_recent": 4,
    "transactions_last_10m": 8,
    "fraud_type": "CARD_TESTING"
}

print("=== NORMAL TRANSACTION SCORE ===")
print(engine.predict(normal_sample))

print("\n=== FRAUD CARD TESTING SCORE ===")
print(engine.predict(fraud_sample))
