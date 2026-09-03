from sqlalchemy.orm import Session
from app.modules.policies.router import get_default_policy
from app.modules.policies.schemas import PolicyEvaluationResult
from app.modules.attacks.schemas import AttackCluster

class PolicyEngine:
    """
    Evaluates automated containment actions against configured Merchant Policies.
    Ensures AI actions do not exceed defined risk thresholds without manual approval.
    """

    @staticmethod
    def evaluate_action(db: Session, action: str, target: str, cluster: AttackCluster) -> PolicyEvaluationResult:
        policy = get_default_policy(db)
        
        # 1. Evaluate auto_block_enabled
        if not policy.auto_block_enabled and action in ("BLOCK_INDIVIDUAL_TRANSACTIONS", "QUARANTINE_DEVICE", "QUARANTINE_IP"):
            return PolicyEvaluationResult(
                is_allowed=False,
                reason="Merchant policy has auto-block disabled globally. Requires manual approval."
            )
            
        # 2. Evaluate Device Quarantine Threshold
        if action == "QUARANTINE_DEVICE":
            if cluster.affected_accounts < policy.device_quarantine_threshold:
                return PolicyEvaluationResult(
                    is_allowed=False,
                    reason=f"Merchant policy requires manual approval for device quarantine. Cluster account size ({cluster.affected_accounts}) does not meet the strict threshold (>={policy.device_quarantine_threshold})."
                )
                
        # 3. Evaluate IP Quarantine Threshold
        if action == "QUARANTINE_IP":
            if cluster.affected_accounts < policy.ip_quarantine_threshold:
                return PolicyEvaluationResult(
                    is_allowed=False,
                    reason=f"Merchant policy requires manual approval for IP quarantine. Cluster account size ({cluster.affected_accounts}) does not meet the strict threshold (>={policy.ip_quarantine_threshold})."
                )
                
        # 4. Evaluate Attack Coverage Check for Quarantines
        # Assuming we pass an explicit rule for high impact infrastructure quarantine
        # This can be expanded as needed.
        
        return PolicyEvaluationResult(is_allowed=True, reason="Action approved by policy engine.")
