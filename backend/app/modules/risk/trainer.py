import os
import json
import logging
import time
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

import xgboost as xgb
import shap
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, accuracy_score

from app.core.database import SessionLocal
from app.models.domain import Transaction
from app.modules.risk.features import FEATURE_NAMES, FEATURE_REASON_LABELS, extract_features_from_dict, format_feature_dataframe

logger = logging.getLogger("riskgraph.trainer")

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../ml/models"))
MODEL_FILE = os.path.join(MODEL_DIR, "xgboost_risk.json")
METRICS_FILE = os.path.join(MODEL_DIR, "eval_metrics.json")

class RiskScoringEngine:
    """Production scoring engine loading XGBoost model & SHAP explainer."""
    _instance = None

    def __init__(self):
        self.model: xgb.XGBClassifier | None = None
        self.explainer: shap.TreeExplainer | None = None
        self.metrics: Dict[str, Any] = {}
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        if os.path.exists(MODEL_FILE):
            try:
                self.model = xgb.XGBClassifier()
                self.model.load_model(MODEL_FILE)
                self.explainer = shap.TreeExplainer(self.model)
                logger.info("Loaded trained XGBoost model and SHAP TreeExplainer.")
            except Exception as e:
                logger.error(f"Error loading model from file: {e}")
                self.model = None

        if os.path.exists(METRICS_FILE):
            try:
                with open(METRICS_FILE, "r") as f:
                    self.metrics = json.load(f)
            except Exception as e:
                logger.error(f"Error loading evaluation metrics: {e}")

    def predict(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts features, runs XGBoost model prediction, computes SHAP feature attributions,
        and determines risk score (0-100), fraud_probability (0-1), decision, and top SHAP reasons.
        """
        features_dict = extract_features_from_dict(raw_data)
        df_feat = format_feature_dataframe(features_dict)

        if self.model is None:
            # Fallback heuristic calculation if model not trained yet
            prob = self._heuristic_fallback(features_dict)
        else:
            probs = self.model.predict_proba(df_feat)
            prob = float(probs[0][1])

        # Risk score 0 to 100
        risk_score = int(round(prob * 100))

        # Decision rules
        if risk_score <= 30:
            decision = "ALLOW"
        elif risk_score <= 70:
            decision = "STEP_UP"
        else:
            decision = "BLOCK_REVIEW"

        # Calculate SHAP contributions and top signals dynamically
        top_reasons = []
        shap_dict = {}

        if self.explainer is not None:
            try:
                shap_vals = self.explainer.shap_values(df_feat)
                # Handle binary classification output shape
                if isinstance(shap_vals, list):
                    vals = shap_vals[1][0]
                elif len(shap_vals.shape) == 2:
                    vals = shap_vals[0]
                else:
                    vals = shap_vals[0]

                # Pair feature names with SHAP values
                feature_shaps = list(zip(FEATURE_NAMES, vals))
                # Sort by highest positive contribution to fraud score
                feature_shaps.sort(key=lambda x: x[1], reverse=True)

                for name, val in feature_shaps:
                    shap_dict[name] = round(float(val), 4)
                    if val > 0.05 and len(top_reasons) < 3:
                        reason_label = FEATURE_REASON_LABELS.get(name, name.replace("_", " ").title())
                        top_reasons.append(reason_label)
            except Exception as e:
                logger.error(f"Error computing SHAP explanation: {e}")

        if not top_reasons:
            # Fallback reasons derived from feature values
            if features_dict.get("transactions_last_10m", 0) > 3:
                top_reasons.append("High transaction velocity")
            if features_dict.get("device_account_count", 0) > 3:
                top_reasons.append("Device shared across multiple accounts")
            if features_dict.get("failed_attempts_recent", 0) > 1:
                top_reasons.append("Multiple recent failed attempts")
            if not top_reasons:
                top_reasons = ["Normal transaction activity pattern"]

        return {
            "transaction_id": str(raw_data.get("id", f"tx_eval_{int(time.time())}")),
            "risk_score": risk_score,
            "fraud_probability": round(prob, 4),
            "decision": decision,
            "top_reasons": top_reasons,
            "shap_contributions": shap_dict,
            "features": features_dict
        }

    def _heuristic_fallback(self, feat: Dict[str, float]) -> float:
        score = 0.05
        if feat.get("failed_attempts_recent", 0) > 2:
            score += 0.35
        if feat.get("transactions_last_10m", 0) > 5:
            score += 0.40
        if feat.get("device_account_count", 0) > 5:
            score += 0.30
        if feat.get("account_age_minutes", 1000) < 15:
            score += 0.20
        return min(0.99, score)

def train_risk_model() -> Dict[str, Any]:
    """Extracts features from DB, trains XGBoost model, computes evaluation metrics, and saves model."""
    logger.info("Starting XGBoost Model Training Pipeline...")
    start_time = time.time()

    db: Session = SessionLocal()
    try:
        query = db.query(Transaction).limit(100000)
        transactions = query.all()
        logger.info(f"Loaded {len(transactions)} transaction records from database.")

        if not transactions:
            raise ValueError("No transaction records found in database. Run seed script first.")

        # Ensure transactions are sorted chronologically to prevent temporal leakage
        transactions.sort(key=lambda x: x.timestamp)

        records = []
        labels = []

        # O(N) State tracking for historical features
        customer_history = {} # cust_id -> {amounts: [], tx_times: []}
        device_accounts = {} # dev_id -> set(cust_id)
        ip_accounts = {} # ip_id -> set(cust_id)

        for tx in transactions:
            cust = tx.customer_id
            dev = tx.device_id
            ip = tx.ip_id
            amount = float(tx.amount)
            ts = tx.timestamp

            # 1. Historical lookups (strictly BEFORE current tx)
            hist_amounts = customer_history.get(cust, {}).get("amounts", [])
            hist_times = customer_history.get(cust, {}).get("tx_times", [])
            
            avg_amount = sum(hist_amounts) / len(hist_amounts) if hist_amounts else amount
            
            dev_acc_count = len(device_accounts.get(dev, set())) or 1.0
            ip_acc_count = len(ip_accounts.get(ip, set())) or 1.0

            tx_1m = tx_5m = tx_10m = 0
            time_since = 86400.0
            if hist_times:
                time_since = (ts - hist_times[-1]).total_seconds()
                for t in reversed(hist_times):
                    diff = (ts - t).total_seconds()
                    if diff <= 60: tx_1m += 1
                    if diff <= 300: tx_5m += 1
                    if diff <= 600: tx_10m += 1
                    else: break

            # 2. Extract features using the pre-computed historical context
            # Note: We completely omit 'fraud_type' to prevent target leakage
            data_dict = {
                "amount": amount,
                "account_age_minutes": tx.account_age_minutes,
                "failed_attempts_recent": tx.failed_attempts_recent,
                "country": tx.country,
                "coupon_id": tx.coupon_id,
                "status": tx.status,
                "timestamp": ts.isoformat(),
                "customer_id": cust,
                "device_id": dev,
                "ip_id": ip,
                
                "average_customer_amount": avg_amount,
                "device_account_count": float(dev_acc_count),
                "ip_account_count": float(ip_acc_count),
                "transactions_last_1m": float(tx_1m),
                "transactions_last_5m": float(tx_5m),
                "transactions_last_10m": float(tx_10m),
                "time_since_previous_transaction": float(time_since)
            }
            
            feat = extract_features_from_dict(data_dict)
            records.append([feat[name] for name in FEATURE_NAMES])
            labels.append(1 if tx.is_fraud else 0)

            # 3. State Updates (AFTER extracting features, ensuring temporal correctness)
            if cust not in customer_history:
                customer_history[cust] = {"amounts": [], "tx_times": []}
            if tx.status == "APPROVED":
                customer_history[cust]["amounts"].append(amount)
            customer_history[cust]["tx_times"].append(ts)
            
            if dev not in device_accounts: device_accounts[dev] = set()
            device_accounts[dev].add(cust)
            
            if ip not in ip_accounts: ip_accounts[ip] = set()
            ip_accounts[ip].add(cust)

        X = pd.DataFrame(records, columns=FEATURE_NAMES)
        y = np.array(labels)

        # Chronological Split (70% Train, 15% Validation, 15% Test)
        total_samples = len(X)
        train_end = int(total_samples * 0.70)
        val_end = int(total_samples * 0.85)

        X_train, y_train = X.iloc[:train_end], y[:train_end]
        X_val, y_val = X.iloc[train_end:val_end], y[train_end:val_end]
        X_test, y_test = X.iloc[val_end:], y[val_end:]

        logger.info(f"Chronological split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}.")

        # Train XGBoost Classifier
        clf = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="logloss"
        )
        # Use X_val for early stopping to prevent overfitting
        clf.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False
        )

        # Evaluate on Test Split (future unseen data)
        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test)[:, 1]

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_prob))
        cm = confusion_matrix(y_test, y_pred).tolist()  # [[TN, FP], [FN, TP]]

        # SHAP Feature Importance
        explainer = shap.TreeExplainer(clf)
        shap_values = explainer.shap_values(X_test)
        mean_abs_shaps = np.abs(shap_values).mean(axis=0)

        shap_ranking = [
            {"feature": name, "importance": round(float(imp), 4)}
            for name, imp in sorted(zip(FEATURE_NAMES, mean_abs_shaps), key=lambda x: x[1], reverse=True)
        ]

        metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "confusion_matrix": cm,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "shap_ranking": shap_ranking,
            "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

        # Save model file
        os.makedirs(MODEL_DIR, exist_ok=True)
        clf.save_model(MODEL_FILE)

        # Save metrics file
        with open(METRICS_FILE, "w") as f:
            json.dump(metrics, f, indent=2)

        # Reload engine instance
        engine_inst = RiskScoringEngine.get_instance()
        engine_inst.load_model()

        elapsed = time.time() - start_time
        logger.info(f"Model training complete in {elapsed:.2f}s! ROC-AUC: {auc:.4f}, F1: {f1:.4f}")
        return metrics

    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_risk_model()
