from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
from app.modules.risk.schemas import RiskScoreResponse, RiskEvaluationRequest
from app.modules.risk.trainer import RiskScoringEngine, train_risk_model

router = APIRouter(prefix="/risk", tags=["Transaction Risk Engine"])

@router.post("/score", response_model=RiskScoreResponse)
def score_transaction(payload: Dict[str, Any] = Body(...)):
    """
    Evaluates a transaction using trained XGBoost model & SHAP explainer.
    Returns risk score (0-100), fraud probability, decision (ALLOW/STEP_UP/BLOCK_REVIEW), and SHAP top reasons.
    """
    engine = RiskScoringEngine.get_instance()
    result = engine.predict(payload)
    return RiskScoreResponse(**result)

@router.get("/metrics")
def get_evaluation_metrics():
    """Retrieve real model evaluation metrics (ROC-AUC, Precision, Recall, F1, Confusion Matrix)."""
    engine = RiskScoringEngine.get_instance()
    if not engine.metrics:
        # If model not trained yet, run training pipeline
        try:
            metrics = train_risk_model()
            return metrics
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to compute model metrics: {e}")
    return engine.metrics

@router.post("/train")
def trigger_training():
    """Trigger manual retraining of XGBoost model on current database dataset."""
    try:
        metrics = train_risk_model()
        return {"message": "Model trained successfully", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")
