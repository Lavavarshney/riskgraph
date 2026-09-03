# RISKGRAPH Machine Learning & SHAP Pipelines

This directory contains the ML interface definitions and XGBoost model wrappers for fraud scoring.

## Architecture

- `models/base.py`: Defines `BaseRiskModel`, an abstract base class ensuring pluggable model substitution.
- `models/xgboost_model.py`: Implements XGBoost scoring logic alongside SHAP feature attribution calculation.

## Rules

- Core fraud calculations must remain deterministic or ML-based.
- No LLMs are used for real-time risk scores.
- Synthetic data only.
