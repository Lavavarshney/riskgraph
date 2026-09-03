from fastapi import APIRouter
from app.api.v1.endpoints.health import router as health_router
from app.modules.payments import payments_router
from app.modules.risk import risk_router
from app.modules.graph import graph_router
from app.modules.attacks import attacks_router
from app.modules.containment import containment_router
from app.modules.policies import policies_router
from app.modules.investigations import investigations_router
from app.modules.simulation import simulation_router

api_router = APIRouter()

# Health router
api_router.include_router(health_router, tags=["Health"])

# Logical Module Routers
api_router.include_router(payments_router)
api_router.include_router(risk_router)
api_router.include_router(graph_router)
api_router.include_router(attacks_router)
api_router.include_router(containment_router)
api_router.include_router(policies_router)
api_router.include_router(investigations_router)
api_router.include_router(simulation_router)
