from app.api.health import router as health_router
from app.api.dashboard import router as dashboard_router
from app.api.emails import router as emails_router
from app.api.workflows import router as workflows_router
from app.api.approvals import router as approvals_router
from app.api.analytics import router as analytics_router
from app.api.workspace import router as workspace_router
from app.api.leads import router as leads_router
from app.api.customers import router as customers_router
from app.api.quotations import router as quotations_router
from app.api.notifications import router as notifications_router
from app.api.knowledge import router as knowledge_router

__all__ = [
    "health_router",
    "dashboard_router",
    "emails_router",
    "workflows_router",
    "approvals_router",
    "analytics_router",
    "workspace_router",
    "leads_router",
    "customers_router",
    "quotations_router",
    "notifications_router",
    "knowledge_router",
]
