# RISKGRAPH - Real-Time Fraud Containment Engine

RISKGRAPH is a real-time payment fraud containment engine built for merchants. Instead of relying solely on isolated transaction scores, RISKGRAPH combines transaction-level risk, behavioral anomalies, network graph intelligence, attack cluster detection, automated containment recommendations, explainable investigation tools, and counterfactual policy simulation.

---

## 🏗️ Repository Layout

```
/frontend    # Next.js 14 (TypeScript, Tailwind CSS, React Flow, Recharts)
/backend     # FastAPI Python backend (SQLAlchemy, Pydantic, WebSockets)
/ml          # XGBoost & SHAP model interfaces
/docker      # Dockerfiles and PostgreSQL init SQL schema
/docs        # Architecture documentation & API specs
```

---

## ⚡ Quick Start (Single Command)

### Option 1: Run with Docker Compose (Recommended)

Make sure Docker Desktop is running, then execute:

```bash
docker compose up --build
```

Access the services:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API & Health**: `http://localhost:8000/health`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432` (User: `riskgraph_user`, DB: `riskgraph_db`)

---

### Option 2: Run Locally (Development Mode)

#### 1. Start Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Start Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔍 API Endpoints Summary

- **Health Check**: `GET /health`
- **Payments**: `GET /api/v1/payments`, `POST /api/v1/payments`
- **Risk Scoring**: `POST /api/v1/risk/evaluate`
- **Network Graph**: `GET /api/v1/graph/subgraph/{entity_id}`
- **Attack Clusters**: `GET /api/v1/attacks`
- **Containment**: `GET /api/v1/containment/recommendations`
- **Policies**: `GET /api/v1/policies`, `POST /api/v1/policies`
- **Investigations**: `GET /api/v1/investigations`, `GET /api/v1/investigations/{case_id}`
- **Counterfactual Simulation**: `POST /api/v1/simulation/run`
- **Realtime WebSocket Stream**: `ws://localhost:8000/ws`
