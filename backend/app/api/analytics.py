from datetime import datetime
from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import Workflow, WorkflowStep, Quotation
from app.schemas.schemas import (
    AnalyticsResponse,
    StageDuration,
    DailyVolume,
    ProductVolume,
)
from app.workflows.state import STAGES

router = APIRouter(tags=["Analytics"])


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsResponse:
    """Computes dynamic analytics statistics on resolution rates, times, volumes, and product revenues."""
    # 1. Total counts
    total_count = db.query(Workflow).count()
    completed_count = db.query(Workflow).filter(Workflow.status == "COMPLETED").count()
    failed_count = db.query(Workflow).filter(Workflow.status == "FAILED").count()

    # Automation rate
    resolved_count = completed_count + failed_count
    automation_rate = (completed_count / (resolved_count or 1)) * 100.0

    # 2. Average resolution time (in seconds)
    completed_workflows = (
        db.query(Workflow).filter(Workflow.status == "COMPLETED").all()
    )
    durations = []
    for wf in completed_workflows:
        diff = (wf.updated_at - wf.created_at).total_seconds()
        durations.append(max(0.0, diff))
    avg_resolution = sum(durations) / len(durations) if durations else 0.0

    # 3. Average step-by-step stage durations
    steps = (
        db.query(WorkflowStep)
        .filter(WorkflowStep.status == "COMPLETED", WorkflowStep.completed_at != None)
        .all()
    )

    stage_sums: Dict[str, float] = {}
    stage_counts: Dict[str, int] = {}
    for step in steps:
        if step.completed_at:
            diff = (step.completed_at - step.started_at).total_seconds()
            stage_sums[step.stage] = stage_sums.get(step.stage, 0.0) + max(0.0, diff)
            stage_counts[step.stage] = stage_counts.get(step.stage, 0) + 1

    avg_stages = []
    for stage in STAGES:
        if stage in stage_counts:
            avg_stages.append(
                StageDuration(
                    stage=stage,
                    avg_duration_seconds=stage_sums[stage] / stage_counts[stage],
                )
            )
        else:
            avg_stages.append(StageDuration(stage=stage, avg_duration_seconds=0.0))

    # 4. Daily workflow volumes (grouped by day)
    all_workflows = db.query(Workflow).all()
    daily_counts: Dict[str, int] = {}
    for wf in all_workflows:
        date_str = wf.created_at.strftime("%Y-%m-%d")
        daily_counts[date_str] = daily_counts.get(date_str, 0) + 1

    daily_volumes = [
        DailyVolume(date=k, count=v) for k, v in sorted(daily_counts.items())
    ]
    if not daily_volumes:
        daily_volumes = [DailyVolume(date=datetime.now().strftime("%Y-%m-%d"), count=0)]

    # 5. Product performance analytics
    quotes = db.query(Quotation).all()
    product_stats: Dict[str, Dict[str, float]] = {}
    for q in quotes:
        items = q.items or []
        for item in items:
            name = item.get("product", "Unknown Item")
            qty = item.get("quantity", 0)
            rev = item.get("total", 0.0)

            if name not in product_stats:
                product_stats[name] = {"quantity": 0.0, "revenue": 0.0}
            product_stats[name]["quantity"] += qty
            product_stats[name]["revenue"] += rev

    top_products = [
        ProductVolume(
            product=k,
            quantity=int(v["quantity"]),
            revenue=v["revenue"],
        )
        for k, v in product_stats.items()
    ]
    # Sort top items by revenue in descending order
    top_products.sort(key=lambda x: x.revenue, reverse=True)

    return AnalyticsResponse(
        automation_rate=automation_rate,
        average_resolution_time_seconds=avg_resolution,
        total_workflows_count=total_count,
        completed_workflows_count=completed_count,
        failed_workflows_count=failed_count,
        avg_stage_durations=avg_stages,
        daily_volumes=daily_volumes,
        top_products=top_products,
    )
