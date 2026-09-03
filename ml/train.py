import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.modules.risk.trainer import train_risk_model

if __name__ == "__main__":
    print("Executing RISKGRAPH Model Training Pipeline...")
    metrics = train_risk_model()
    print("\n--- Training & Evaluation Results ---")
    print(f"Accuracy:  {metrics['accuracy'] * 100:.2f}%")
    print(f"Precision: {metrics['precision'] * 100:.2f}%")
    print(f"Recall:    {metrics['recall'] * 100:.2f}%")
    print(f"F1 Score:  {metrics['f1_score']:.4f}")
    print(f"ROC-AUC:   {metrics['roc_auc']:.4f}")
    print(f"Confusion Matrix: {metrics['confusion_matrix']}")
    print("\nTop 5 SHAP Features:")
    for item in metrics['shap_ranking'][:5]:
        print(f"  - {item['feature']}: {item['importance']}")
