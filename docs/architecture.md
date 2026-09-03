# RISKGRAPH System Architecture Overview

RISKGRAPH is an enterprise-grade real-time fraud containment engine designed for payment merchants.

## Core Intelligence Pillars

1. **Transaction-Level Risk**: XGBoost tree model scoring feature vectors extracted per transaction.
2. **Behavioral Anomalies**: Velocity metrics across IP addresses, devices, and card hash pools.
3. **Relationship/Network Intelligence**: Multi-hop entity graph traversing payment connections in PostgreSQL/NetworkX.
4. **Attack-Cluster Detection**: Real-time graph clustering uncovering coordinated fraud rings.
5. **Containment Recommendations**: Automated containment actions (IP block, card hash block, 3DS requirement).
6. **Explainable Investigation**: SHAP attribution breakdown and visual graph exploration.
7. **Counterfactual Impact Simulation**: Historical policy backtesting to quantify prevented fraud loss vs false positives.

## Component Breakdown

```
[ Frontend: Next.js + React Flow + Recharts ]
                  | (REST + WebSockets)
                  v
[ Backend: FastAPI Engine ]
   ├── /payments: Real-time event ingestion
   ├── /risk: Scoring & SHAP generation
   ├── /graph: Entity relationship queries
   ├── /attacks: Cluster detection engine
   ├── /containment & /policies: Mitigation rules
   ├── /investigations: Case deep-dives
   └── /simulation: Counterfactual engine
                  |
                  v
[ PostgreSQL Database ]
```
