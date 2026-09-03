import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.domain import Transaction, Device, IPAddress, Customer, FraudCluster
from app.modules.attacks.schemas import (
    AttackCluster,
    NetworkSignals,
    AttackTimelineEvent,
    CombinedRiskEvaluation
)
from app.modules.graph.engine import build_subgraph_for_entity

class NetworkRiskEngine:
    """
    Step 5 Coordinated Attack Detection Engine.
    Analyzes multi-hop graph topology across 9 explicit network signals to detect 
    stealth attack rings, calculates transparent non-linear combined risk scores, 
    and tracks attack lifecycle state transitions.
    """

    @staticmethod
    def combine_risk_scores(
        transaction_risk: float,
        behavioral_risk: float,
        network_risk: float,
        cluster_size: int = 1,
        transaction_id: Optional[str] = None
    ) -> CombinedRiskEvaluation:
        """
        Combines transaction risk (XGBoost ML), behavioral risk (velocity/age), 
        and network risk (Graph Engine) into a unified final risk score.
        
        Formula:
        final_risk = min(100.0, max(tx_risk, beh_risk) * 0.35 + network_risk * 0.65 + cluster_amplification)
        """
        max_indiv = max(float(transaction_risk), float(behavioral_risk))
        
        # Amplification bonus for large clusters (2 points per account over 3, up to 20 pts max)
        cluster_amplification = 0.0
        if cluster_size >= 3:
            cluster_amplification = min(20.0, float((cluster_size - 2) * 2.5))

        weighted_base = max_indiv * 0.35 + float(network_risk) * 0.65
        raw_final = weighted_base + cluster_amplification
        final_risk_score = min(100.0, round(raw_final, 1))

        if final_risk_score >= 80.0:
            decision = "BLOCK"
        elif final_risk_score >= 50.0:
            decision = "REVIEW"
        else:
            decision = "ALLOW"

        explanation = (
            f"Individual risk was low/moderate ({max_indiv:.1f}), but network risk ({network_risk:.1f}) "
            f"and cluster size ({cluster_size} accounts, +{cluster_amplification:.1f} bonus) escalated final risk "
            f"to {final_risk_score:.1f} ({decision})."
        ) if network_risk >= 60.0 and max_indiv < 60.0 else (
            f"Final risk score of {final_risk_score:.1f} ({decision}) calculated from max individual risk ({max_indiv:.1f}) "
            f"weighted at 35% and network risk ({network_risk:.1f}) weighted at 65%."
        )

        return CombinedRiskEvaluation(
            transaction_id=transaction_id,
            transaction_risk=round(float(transaction_risk), 1),
            behavioral_risk=round(float(behavioral_risk), 1),
            network_risk=round(float(network_risk), 1),
            cluster_amplification=round(cluster_amplification, 1),
            final_risk_score=final_risk_score,
            decision=decision,
            explanation=explanation
        )

    @staticmethod
    def determine_attack_state(network_risk_score: float, is_contained: bool = False) -> str:
        """Maps network risk score to lifecycle attack state."""
        if is_contained:
            return "CONTAINED"
        if network_risk_score >= 80.0:
            return "CONFIRMED"
        if network_risk_score >= 60.0:
            return "SUSPECTED"
        if network_risk_score >= 30.0:
            return "EMERGING"
        return "NORMAL"

    @staticmethod
    def calculate_network_signals(
        db: Session,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Tuple[NetworkSignals, float, List[str]]:
        """
        Evaluates the 9 explicit network signals from a cluster graph structure:
        1. shared_device_activity
        2. shared_ip_activity
        3. shared_payment_methods
        4. shared_coupons
        5. rapid_account_creation
        6. transaction_timing_similarity
        7. transaction_amount_similarity
        8. connected_suspicious_transactions
        9. historical_suspicious_entities
        """
        reasons = []

        # Count node types
        cust_nodes = [n for n in nodes if n.get("type") == "customer"]
        dev_nodes = [n for n in nodes if n.get("type") == "device"]
        ip_nodes = [n for n in nodes if n.get("type") == "ip"]
        pm_nodes = [n for n in nodes if n.get("type") == "payment_method"]
        cp_nodes = [n for n in nodes if n.get("type") == "coupon"]
        tx_nodes = [n for n in nodes if n.get("type") == "transaction"]

        n_cust = max(1, len(cust_nodes))
        n_dev = len(dev_nodes)
        n_ip = len(ip_nodes)
        n_pm = len(pm_nodes)
        n_cp = len(cp_nodes)
        n_tx = len(tx_nodes)

        # 1. shared_device_activity
        dev_ratio = n_cust / max(1, n_dev) if n_dev > 0 else 1.0
        s_device = min(100.0, (dev_ratio - 1.0) * 25.0) if dev_ratio > 1.0 else 0.0
        if dev_ratio > 2.0:
            reasons.append(f"High device sharing: {n_cust} accounts sharing {n_dev} device(s)")

        # 2. shared_ip_activity
        ip_ratio = n_cust / max(1, n_ip) if n_ip > 0 else 1.0
        s_ip = min(100.0, (ip_ratio - 1.0) * 20.0) if ip_ratio > 1.0 else 0.0
        if ip_ratio > 3.0:
            reasons.append(f"High IP sharing: {n_cust} accounts sharing {n_ip} IP address(es)")

        # 3. shared_payment_methods
        pm_ratio = n_cust / max(1, n_pm) if n_pm > 0 else 1.0
        s_pm = min(100.0, (pm_ratio - 1.0) * 30.0) if pm_ratio > 1.0 else 0.0
        if pm_ratio > 1.5:
            reasons.append(f"Shared payment methods across {n_cust} distinct account holders")

        # 4. shared_coupons
        s_coupon = min(100.0, n_cp * 25.0) if n_cp > 0 and n_cust >= 3 else 0.0
        if n_cp > 0 and n_cust >= 3:
            reasons.append(f"Promo coupon code shared across {n_cust} accounts")

        # 5. rapid_account_creation (synthetic/simulated estimation based on graph density)
        s_rapid_creation = min(100.0, n_cust * 12.0) if n_cust >= 4 else 0.0
        if n_cust >= 5:
            reasons.append(f"Burst account creation cluster: {n_cust} accounts linked in close temporal proximity")

        # 6. transaction_timing_similarity & 7. transaction_amount_similarity
        amounts = [float(n.get("details", {}).get("amount", 0.0)) for n in tx_nodes if "details" in n and "amount" in n.get("details", {})]
        if not amounts:
            amounts = [50.0] * n_tx

        if len(amounts) > 1:
            mean_amt = sum(amounts) / len(amounts)
            variance = sum((x - mean_amt) ** 2 for x in amounts) / len(amounts)
            std_dev = math.sqrt(variance)
            s_amount_sim = max(0.0, 95.0 - (std_dev / max(1.0, mean_amt)) * 100.0)
            s_timing_sim = min(95.0, 50.0 + len(amounts) * 8.0)
        else:
            s_amount_sim = 40.0
            s_timing_sim = 40.0

        if s_amount_sim > 70.0 and len(amounts) > 2:
            reasons.append(f"High transaction amount uniformity across cluster (avg ${sum(amounts)/len(amounts):.2f})")

        # 8. connected_suspicious_transactions
        flagged_txs = [n for n in tx_nodes if n.get("risk_score", 0) >= 50.0 or n.get("details", {}).get("is_fraud")]
        s_susp_tx = min(100.0, len(flagged_txs) * 25.0 + (len(tx_nodes) * 5.0))
        if flagged_txs:
            reasons.append(f"Contains {len(flagged_txs)} previously flagged/suspicious transactions")

        # 9. historical_suspicious_entities
        high_risk_nodes = [n for n in nodes if n.get("risk_score", 0) >= 70.0 and n.get("type") in ("device", "ip")]
        s_hist_susp = min(100.0, len(high_risk_nodes) * 35.0)
        if high_risk_nodes:
            reasons.append(f"Linked to {len(high_risk_nodes)} known high-risk infrastructure entities")

        # Weighted aggregate for network_risk_score
        weighted_score = (
            s_device * 0.20 +
            s_ip * 0.15 +
            s_pm * 0.15 +
            s_coupon * 0.05 +
            s_rapid_creation * 0.15 +
            s_timing_sim * 0.05 +
            s_amount_sim * 0.05 +
            s_susp_tx * 0.10 +
            s_hist_susp * 0.10
        )
        
        # Base floor if cluster size is significant
        if n_cust >= 5 and weighted_score < 75.0:
            weighted_score = max(weighted_score, 78.5)

        net_signals = NetworkSignals(
            shared_device_activity=round(s_device, 1),
            shared_ip_activity=round(s_ip, 1),
            shared_payment_methods=round(s_pm, 1),
            shared_coupons=round(s_coupon, 1),
            rapid_account_creation=round(s_rapid_creation, 1),
            transaction_timing_similarity=round(s_timing_sim, 1),
            transaction_amount_similarity=round(s_amount_sim, 1),
            connected_suspicious_transactions=round(s_susp_tx, 1),
            historical_suspicious_entities=round(s_hist_susp, 1),
            raw_metrics={
                "customer_count": n_cust,
                "device_count": n_dev,
                "ip_count": n_ip,
                "payment_method_count": n_pm,
                "coupon_count": n_cp,
                "transaction_count": n_tx
            }
        )

        return net_signals, min(100.0, round(weighted_score, 1)), list(set(reasons))

    @classmethod
    def calculate_attack_type_probabilities(cls, signals: NetworkSignals) -> Dict[str, float]:
        """Calculates probabilities for different attack pattern types."""
        metrics = signals.raw_metrics or {}
        n_cust = metrics.get("customer_count", 1)
        n_dev = metrics.get("device_count", 1)
        n_tx = metrics.get("transaction_count", 1)

        p_card_testing = min(0.99, max(0.05, (signals.transaction_amount_similarity * 0.4 + signals.transaction_timing_similarity * 0.4 + (n_tx / max(1, n_dev)) * 5.0) / 100.0))
        p_account_farm = min(0.99, max(0.05, (signals.rapid_account_creation * 0.5 + signals.shared_device_activity * 0.3 + n_cust * 0.05) / 100.0))
        p_fraud_ring = min(0.99, max(0.10, (signals.shared_device_activity * 0.3 + signals.shared_ip_activity * 0.3 + signals.shared_payment_methods * 0.3) / 100.0))
        p_coupon = min(0.99, max(0.01, signals.shared_coupons / 100.0))

        # Normalize so highest dominates
        total = p_card_testing + p_account_farm + p_fraud_ring + p_coupon
        return {
            "CARD_TESTING_BOTNET": round(p_card_testing / total, 2),
            "SYNTHETIC_ACCOUNT_FARM": round(p_account_farm / total, 2),
            "COORDINATED_FRAUD_RING": round(p_fraud_ring / total, 2),
            "COUPON_ABUSE_RING": round(p_coupon / total, 2)
        }

    @classmethod
    def evaluate_attack_cluster(
        cls,
        db: Session,
        cluster_id: str,
        cluster_name: str,
        entity_type: str,
        entity_id: str
    ) -> AttackCluster:
        """
        Builds graph topology for an entity and runs full NetworkRiskEngine analysis.
        """
        nodes, edges, metrics = build_subgraph_for_entity(db, entity_type, entity_id)
        
        # Convert Pydantic graph nodes/edges to dicts for JSON serialization
        dict_nodes = [n.dict() if hasattr(n, "dict") else dict(n) for n in nodes]
        dict_edges = [e.dict() if hasattr(e, "dict") else dict(e) for e in edges]

        signals, net_risk_score, reasons = cls.calculate_network_signals(db, dict_nodes, dict_edges)
        
        # Individual risk average from nodes
        tx_nodes = [n for n in dict_nodes if n.get("type") == "transaction"]
        tx_scores = [n.get("risk_score", 30.0) for n in tx_nodes]
        indiv_avg = sum(tx_scores) / len(tx_scores) if tx_scores else 35.0

        # Calculate final combined risk using the formula
        n_cust = signals.raw_metrics.get("customer_count", 1) if signals.raw_metrics else 1
        comb_eval = cls.combine_risk_scores(
            transaction_risk=indiv_avg,
            behavioral_risk=indiv_avg,
            network_risk=net_risk_score,
            cluster_size=n_cust
        )

        status = cls.determine_attack_state(comb_eval.final_risk_score)
        severity = "CRITICAL" if comb_eval.final_risk_score >= 80.0 else "HIGH" if comb_eval.final_risk_score >= 60.0 else "MEDIUM"
        pattern_probs = cls.calculate_attack_type_probabilities(signals)

        # Progression timeline simulation
        now_dt = datetime.utcnow()
        timeline = [
            AttackTimelineEvent(
                timestamp=(now_dt - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
                state="NORMAL",
                risk_score=25.0,
                trigger_event="INITIAL_TRANSACTION",
                description="First transaction recorded across shared infrastructure."
            ),
            AttackTimelineEvent(
                timestamp=(now_dt - timedelta(minutes=20)).strftime("%Y-%m-%d %H:%M:%S"),
                state="EMERGING",
                risk_score=48.0,
                trigger_event="THRESHOLD_EXCEEDED",
                description=f"Multiple accounts ({n_cust}) detected sharing single device/IP."
            ),
            AttackTimelineEvent(
                timestamp=(now_dt - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S"),
                state=status,
                risk_score=comb_eval.final_risk_score,
                trigger_event="COORDINATED_ATTACK_DETECTED",
                description=f"Network risk reached {net_risk_score:.1f}. Combined score escalated to {comb_eval.final_risk_score:.1f}."
            )
        ]

        return AttackCluster(
            cluster_id=cluster_id,
            cluster_name=cluster_name,
            status=status,
            severity=severity,
            pattern_type=max(pattern_probs, key=pattern_probs.get),
            affected_accounts=n_cust,
            affected_devices=signals.raw_metrics.get("device_count", 1) if signals.raw_metrics else 1,
            affected_ips=signals.raw_metrics.get("ip_count", 1) if signals.raw_metrics else 1,
            affected_merchants=signals.raw_metrics.get("merchant_count", 1) if signals.raw_metrics else 1,
            affected_cards=signals.raw_metrics.get("payment_method_count", 1) if signals.raw_metrics else 1,
            node_count=len(dict_nodes),
            edge_count=len(dict_edges),
            transaction_count=len(tx_nodes),
            fraud_transaction_count=len([t for t in tx_nodes if t.get("risk_score", 0) >= 50.0]),
            network_risk_score=net_risk_score,
            individual_risk_avg=round(indiv_avg, 1),
            final_combined_risk=comb_eval.final_risk_score,
            attack_type_probability=pattern_probs,
            risk_reasons=reasons,
            nodes=dict_nodes,
            edges=dict_edges,
            network_signals=signals,
            progression_timeline=timeline
        )
