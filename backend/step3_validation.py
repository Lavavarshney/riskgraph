import sys
import os
import json
import time
from datetime import datetime
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal, engine
from app.models.domain import Transaction
from app.modules.risk.features import extract_features_from_dict, FEATURE_NAMES
from app.modules.risk.trainer import RiskScoringEngine

def run_validation():
    print("=" * 60, flush=True)
    print("STEP 3 COMPLETE FINAL VALIDATION SCRIPT (FAST BATCH)", flush=True)
    print("=" * 60, flush=True)

    db = SessionLocal()
    results = {}

    try:
        # PART 1: Database Check
        dialect = engine.dialect.name
        results["db_dialect"] = dialect

        total_tx = db.query(Transaction).count()
        legit_tx = db.query(Transaction).filter(Transaction.is_fraud == False).count()
        fraud_tx = db.query(Transaction).filter(Transaction.is_fraud == True).count()
        fraud_pct = round((fraud_tx / total_tx) * 100, 2) if total_tx > 0 else 0

        from sqlalchemy import func
        type_counts = db.query(Transaction.fraud_type, func.count(Transaction.id)).group_by(Transaction.fraud_type).all()
        fraud_type_breakdown = {ft: count for ft, count in type_counts}

        results["part1"] = {
            "total_transactions": total_tx,
            "legitimate_transactions": legit_tx,
            "fraudulent_transactions": fraud_tx,
            "fraud_percentage": fraud_pct,
            "fraud_type_breakdown": fraud_type_breakdown
        }
        print(f"[PART 1] Dialect: {dialect} | Total: {total_tx} | Legit: {legit_tx} | Fraud: {fraud_tx} ({fraud_pct}%)", flush=True)
        print(f"         Breakdown: {fraud_type_breakdown}", flush=True)

        # PART 2: Features
        results["part2_features"] = FEATURE_NAMES
        print(f"[PART 2] 15 Model Features: {FEATURE_NAMES}", flush=True)

        # PART 3: Target Leakage Test
        sample_tx = db.query(Transaction).filter(Transaction.is_fraud == True).first()
        raw_dict = {
            "amount": float(sample_tx.amount),
            "account_age_minutes": sample_tx.account_age_minutes,
            "failed_attempts_recent": sample_tx.failed_attempts_recent,
            "country": sample_tx.country,
            "coupon_id": sample_tx.coupon_id,
            "customer_id": sample_tx.customer_id,
            "device_id": sample_tx.device_id,
            "ip_id": sample_tx.ip_id,
            "timestamp": sample_tx.timestamp.isoformat(),
            "status": sample_tx.status,
            "fraud_type": sample_tx.fraud_type,
            "is_fraud": sample_tx.is_fraud
        }

        feat_orig = extract_features_from_dict(raw_dict)
        raw_changed_type = raw_dict.copy()
        raw_changed_type["fraud_type"] = "NORMAL"
        feat_changed_type = extract_features_from_dict(raw_changed_type)

        raw_changed_fraud = raw_dict.copy()
        raw_changed_fraud["is_fraud"] = False
        feat_changed_fraud = extract_features_from_dict(raw_changed_fraud)

        pass_type = (feat_orig == feat_changed_type)
        pass_fraud = (feat_orig == feat_changed_fraud)
        results["part3"] = {"fraud_type_test_pass": pass_type, "is_fraud_test_pass": pass_fraud}
        print(f"[PART 3] Target Leakage Test: Change fraud_type Pass={pass_type}, Change is_fraud Pass={pass_fraud}", flush=True)

        # PART 4: ID Leakage Test
        excluded = ["transaction_id", "customer_id", "device_id", "ip_id", "payment_method_id", "is_fraud", "fraud_type"]
        has_id_leak = any(col in FEATURE_NAMES for col in excluded)
        results["part4"] = {"id_leakage_pass": not has_id_leak, "columns": FEATURE_NAMES}
        print(f"[PART 4] ID Leakage Test: Passed={not has_id_leak}", flush=True)

        # PART 5 & 6: Temporal & Chronological Split
        all_txs = db.query(Transaction).order_by(Transaction.timestamp.asc()).all()

        total_n = len(all_txs)
        train_idx = int(total_n * 0.70)
        val_idx = int(total_n * 0.85)

        train_set = all_txs[:train_idx]
        val_set = all_txs[train_idx:val_idx]
        test_set = all_txs[val_idx:]

        train_fraud = sum(1 for tx in train_set if tx.is_fraud)
        val_fraud = sum(1 for tx in val_set if tx.is_fraud)
        test_fraud = sum(1 for tx in test_set if tx.is_fraud)

        results["part6"] = {
            "train": {"count": len(train_set), "min_time": str(train_set[0].timestamp), "max_time": str(train_set[-1].timestamp), "fraud": train_fraud},
            "val": {"count": len(val_set), "min_time": str(val_set[0].timestamp), "max_time": str(val_set[-1].timestamp), "fraud": val_fraud},
            "test": {"count": len(test_set), "min_time": str(test_set[0].timestamp), "max_time": str(test_set[-1].timestamp), "fraud": test_fraud}
        }
        print(f"[PART 6] Chronological Split (70/15/15):", flush=True)
        print(f"         Train: {len(train_set)} (Fraud: {train_fraud})", flush=True)
        print(f"         Val:   {len(val_set)} (Fraud: {val_fraud})", flush=True)
        print(f"         Test:  {len(test_set)} (Fraud: {test_fraud})", flush=True)

        # PART 7, 8, 9, 10, 11, 12: Fast Batch Feature Matrix Construction
        print("[FAST BATCH] Extracting full feature matrix chronologically...", flush=True)
        cust_hist = {}
        dev_accs = {}
        ip_accs = {}

        records = []
        labels = []
        fraud_types = []
        tx_ids = []
        cust_ids = []
        dev_ids = []
        ip_ids = []
        pm_ids = []
        amounts = []
        account_ages = []
        failed_attempts = []

        for tx in all_txs:
            c, d, i_p, amt, ts = tx.customer_id, tx.device_id, tx.ip_id, float(tx.amount), tx.timestamp

            hist_amounts = cust_hist.get(c, {}).get("amounts", [])
            hist_times = cust_hist.get(c, {}).get("tx_times", [])
            avg_amt = sum(hist_amounts) / len(hist_amounts) if hist_amounts else amt
            dev_cnt = len(dev_accs.get(d, set())) or 1.0
            ip_cnt = len(ip_accs.get(i_p, set())) or 1.0

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

            raw = {
                "amount": amt,
                "account_age_minutes": tx.account_age_minutes,
                "failed_attempts_recent": tx.failed_attempts_recent,
                "country": tx.country,
                "coupon_id": tx.coupon_id,
                "status": tx.status,
                "timestamp": ts.isoformat(),
                "customer_id": c, "device_id": d, "ip_id": i_p,
                "average_customer_amount": avg_amt,
                "device_account_count": float(dev_cnt),
                "ip_account_count": float(ip_cnt),
                "transactions_last_1m": float(tx_1m),
                "transactions_last_5m": float(tx_5m),
                "transactions_last_10m": float(tx_10m),
                "time_since_previous_transaction": float(time_since)
            }
            feat = extract_features_from_dict(raw)
            records.append([feat[name] for name in FEATURE_NAMES])
            labels.append(1 if tx.is_fraud else 0)
            fraud_types.append(tx.fraud_type)
            tx_ids.append(tx.id)
            cust_ids.append(c)
            dev_ids.append(d)
            ip_ids.append(i_p)
            pm_ids.append(tx.payment_method_id)
            amounts.append(amt)
            account_ages.append(tx.account_age_minutes)
            failed_attempts.append(tx.failed_attempts_recent)

            # State updates AFTER extraction
            if c not in cust_hist: cust_hist[c] = {"amounts": [], "tx_times": []}
            if tx.status == "APPROVED": cust_hist[c]["amounts"].append(amt)
            cust_hist[c]["tx_times"].append(ts)
            if d not in dev_accs: dev_accs[d] = set()
            dev_accs[d].add(c)
            if i_p not in ip_accs: ip_accs[i_p] = set()
            ip_accs[i_p].add(c)

        df_X = pd.DataFrame(records, columns=FEATURE_NAMES)
        arr_y = np.array(labels)

        # Batch Model Prediction
        engine_inst = RiskScoringEngine.get_instance()
        clf = engine_inst.model

        probs = clf.predict_proba(df_X)[:, 1]
        scores = np.round(probs * 100).astype(int)

        df_all = df_X.copy()
        df_all["tx_id"] = tx_ids
        df_all["customer_id"] = cust_ids
        df_all["device_id"] = dev_ids
        df_all["ip_id"] = ip_ids
        df_all["payment_method_id"] = pm_ids
        df_all["is_fraud"] = arr_y
        df_all["fraud_type"] = fraud_types
        df_all["prob"] = probs
        df_all["risk_score"] = scores

        # PART 8: Evaluation on Test Split (last 15%)
        test_df = df_all.iloc[val_idx:]
        test_y = arr_y[val_idx:]
        test_probs = probs[val_idx:]
        test_preds = (test_probs >= 0.50).astype(int)

        from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score, roc_auc_score
        cm = confusion_matrix(test_y, test_preds).tolist()
        tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]

        prec = float(precision_score(test_y, test_preds, zero_division=0))
        rec = float(recall_score(test_y, test_preds, zero_division=0))
        f1 = float(f1_score(test_y, test_preds, zero_division=0))
        auc = float(roc_auc_score(test_y, test_probs))
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

        results["part8"] = {
            "train_samples": train_idx,
            "val_samples": val_idx - train_idx,
            "test_samples": len(test_df),
            "legit_test": int(sum(test_y == 0)),
            "fraud_test": int(sum(test_y == 1)),
            "tp": tp, "tn": tn, "fp": fp, "fn": fn,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "fpr": round(fpr, 4),
            "fnr": round(fnr, 4),
            "confusion_matrix": cm
        }
        print(f"[PART 8] Test Set Evaluation (15,000 samples):", flush=True)
        print(f"         Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f} | AUC: {auc:.4f}", flush=True)
        print(f"         CM: TN={tn}, FP={fp}, FN={fn}, TP={tp} | FPR: {fpr:.4f}, FNR: {fnr:.4f}", flush=True)

        # PART 9: Model Too Perfect Check & Correlations
        correlations = {}
        for col in FEATURE_NAMES:
            corr = float(np.corrcoef(df_X[col], arr_y)[0, 1])
            correlations[col] = round(corr, 4)

        grouped_means = df_all.groupby("fraud_type")[FEATURE_NAMES].mean().to_dict()

        results["part9"] = {
            "feature_correlations_with_is_fraud": correlations,
            "feature_means_by_fraud_type": grouped_means
        }
        print(f"[PART 9] Top Feature Correlations with is_fraud: {sorted(correlations.items(), key=lambda x: abs(x[1]), reverse=True)[:5]}", flush=True)

        # PART 10: SHAP Validation for 3 Selected Samples
        # Select 1 legit, 1 medium-risk (or closest), 1 high-risk
        legit_row = df_all[df_all["is_fraud"] == 0].iloc[0]
        med_row = df_all[(df_all["risk_score"] >= 25) & (df_all["risk_score"] <= 75)]
        if med_row.empty:
            med_row = df_all.iloc[1000]
        else:
            med_row = med_row.iloc[0]
        high_row = df_all[(df_all["is_fraud"] == 1) & (df_all["risk_score"] > 80)].iloc[0]

        explainer = engine_inst.explainer

        def get_shap_details(row):
            feat_vals = row[FEATURE_NAMES].to_dict()
            df_single = pd.DataFrame([feat_vals], columns=FEATURE_NAMES)
            shap_v = explainer.shap_values(df_single)
            if isinstance(shap_v, list): vals = shap_v[1][0]
            elif len(shap_v.shape) == 2: vals = shap_v[0]
            else: vals = shap_v[0]

            shaps = list(zip(FEATURE_NAMES, [float(x) for x in vals], [float(feat_vals[f]) for f in FEATURE_NAMES]))
            shaps.sort(key=lambda x: x[1], reverse=True)

            top_pos = [{"feature": f, "value": v, "shap": round(s, 4)} for f, s, v in shaps if s > 0][:5]
            top_neg = [{"feature": f, "value": v, "shap": round(s, 4)} for f, s, v in sorted(shaps, key=lambda x: x[1]) if s < 0][:5]

            return {
                "tx_id": str(row["tx_id"]),
                "fraud_type": str(row["fraud_type"]),
                "is_fraud": bool(row["is_fraud"]),
                "prob": float(row["prob"]),
                "risk_score": int(row["risk_score"]),
                "top_positive_shap": top_pos,
                "top_negative_shap": top_neg
            }

        results["part10_shap"] = {
            "legitimate": get_shap_details(legit_row),
            "medium_risk": get_shap_details(med_row),
            "high_risk": get_shap_details(high_row)
        }
        print(f"[PART 10] SHAP Validated for Legit ({legit_row['tx_id']}), Med ({med_row['tx_id']}), High ({high_row['tx_id']})", flush=True)

        # PART 11 & 12: Low Risk Fraud Analysis (< 30 Risk Score)
        low_risk_frauds = df_all[(df_all["is_fraud"] == 1) & (df_all["risk_score"] < 30)]

        # Calculate relational context for low risk frauds
        # Map device and ip customer counts in full dataset
        dev_cust_count = df_all.groupby("device_id")["customer_id"].nunique().to_dict()
        ip_cust_count = df_all.groupby("ip_id")["customer_id"].nunique().to_dict()
        dev_tx_count = df_all.groupby("device_id")["tx_id"].count().to_dict()
        dev_fraud_count = df_all.groupby("device_id")["is_fraud"].sum().to_dict()

        low_risk_list = []
        for _, r in low_risk_frauds.iterrows():
            d = r["device_id"]
            i_p = r["ip_id"]
            low_risk_list.append({
                "transaction_id": str(r["tx_id"]),
                "fraud_type": str(r["fraud_type"]),
                "risk_score": int(r["risk_score"]),
                "customer_id": str(r["customer_id"]),
                "device_id": str(d),
                "ip_id": str(i_p),
                "payment_method_id": str(r["payment_method_id"]),
                "device_account_count": float(r["device_account_count"]),
                "ip_account_count": float(r["ip_account_count"]),
                "total_shared_device_customers": int(dev_cust_count.get(d, 1)),
                "total_shared_ip_customers": int(ip_cust_count.get(i_p, 1)),
                "total_related_transactions": int(dev_tx_count.get(d, 1)),
                "total_related_fraud_transactions": int(dev_fraud_count.get(d, 0))
            })

        # Sort by total_shared_device_customers desc
        low_risk_list.sort(key=lambda x: x["total_shared_device_customers"], reverse=True)

        results["part11_20_low_risk_frauds"] = low_risk_list[:20]
        results["part12_top10_critical_examples"] = low_risk_list[:10]

        print(f"[PART 11 & 12] Total Low-Risk Fraud (Risk < 30): {len(low_risk_frauds)}", flush=True)
        print(f"              Top Critical Relational Example: {low_risk_list[0]['transaction_id']} (Risk: {low_risk_list[0]['risk_score']}, Shared Dev Cust: {low_risk_list[0]['total_shared_device_customers']})", flush=True)

        with open("step3_validation_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)

        print("\nSUCCESS: Step 3 complete validation results saved to step3_validation_results.json", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    run_validation()
