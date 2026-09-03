from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.websockets import ws_manager
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Build explicit origins list robustly
origins = set()
for origin in settings.BACKEND_CORS_ORIGINS:
    origin_str = str(origin).strip()
    if origin_str.startswith("[") and origin_str.endswith("]"):
        import json
        try:
            origins.update(json.loads(origin_str))
        except:
            origins.add(origin_str)
    else:
        origins.update([o.strip() for o in origin_str.split(",") if o.strip()])

origins.update(["http://localhost:3000", "http://127.0.0.1:3000"])

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

from app.modules.policies.router import router as policies_router
app.include_router(policies_router, prefix="/api/v1")
app.include_router(policies_router)  # Also mount at root for easy access

from app.modules.investigations.router import router as investigations_router
app.include_router(investigations_router, prefix="/api/v1")
app.include_router(investigations_router)

from app.modules.attacks.router import router as attacks_router
app.include_router(attacks_router, prefix="/api/v1")
app.include_router(attacks_router)

from app.modules.demo.router import router as demo_router
app.include_router(demo_router, prefix="/api/v1")
app.include_router(demo_router)

# Root level health, risk scoring, & attack cluster endpoints for convenience
@app.get("/health")
def root_health():
    from app.api.v1.endpoints.health import health_check
    return health_check()

@app.post("/risk/score")
def root_risk_score(payload: dict):
    from app.modules.risk.router import score_transaction
    return score_transaction(payload)

@app.get("/attacks/active")
def root_active_attacks(limit: int = 10):
    from app.modules.attacks.router import get_active_attacks
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        return get_active_attacks(limit=limit, db=db)
    finally:
        db.close()

@app.get("/attacks/{cluster_id}/counterfactual")
def root_counterfactual_simulation(cluster_id: str):
    from app.modules.attacks.router import get_counterfactual_simulation
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        return get_counterfactual_simulation(cluster_id=cluster_id, db=db)
    finally:
        db.close()

@app.get("/attacks/{cluster_id}")
def root_attack_by_id(cluster_id: str):
    from app.modules.attacks.router import get_attack_cluster_by_id
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        return get_attack_cluster_by_id(cluster_id=cluster_id, db=db)
    finally:
        db.close()

@app.get("/attacks/{cluster_id}/containment-options")
def root_containment_options(cluster_id: str):
    from app.modules.attacks.router import get_containment_options
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        return get_containment_options(cluster_id=cluster_id, db=db)
    finally:
        db.close()

@app.post("/attacks/{cluster_id}/contain")
async def root_contain_attack(cluster_id: str, payload: dict = None):
    from app.modules.attacks.router import contain_attack_cluster
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        return await contain_attack_cluster(cluster_id=cluster_id, payload=payload, db=db)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health"
    }

# WebSocket Endpoint for real-time payment events and risk alerts
@app.websocket("/ws/payments")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo heartbeat or incoming client signals
            await websocket.send_json({"event": "ack", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
