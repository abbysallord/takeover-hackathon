from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health() -> dict:
    """Returns the current operational status of the service."""
    return {"status": "ok", "service": "AI Sales Operations Manager Backend"}
