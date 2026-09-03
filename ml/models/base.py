from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple

class BaseRiskModel(ABC):
    """Abstract interface for fraud scoring models to enable pluggable ML engine replacements."""
    
    @abstractmethod
    def predict_risk(self, features: Dict[str, Any]) => Tuple[float, Dict[str, float]]:
        """
        Given a set of engineered transaction and graph features,
        returns (risk_score, shap_contributions).
        """
        pass
