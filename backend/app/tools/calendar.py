from datetime import datetime, timedelta
import random
from typing import Any, Dict
from app.tools.base import BaseTool


class CalendarTool(BaseTool):
    @property
    def name(self) -> str:
        return "calendar_tool"

    @property
    def description(self) -> str:
        return "Schedules callbacks and meetings, sending calendar invitations to external stakeholders."

    def schedule_followup(
        self, customer_email: str, title: str, days_from_now: int = 3
    ) -> Dict[str, Any]:
        """Schedules a follow-up call on the operator calendar and sends an invite."""
        event_id = f"evt_{random.randint(100000, 999999)}"
        scheduled_time = datetime.now() + timedelta(days=days_from_now)
        # Mock time: set to 10:00 AM on that day
        scheduled_time = scheduled_time.replace(
            hour=10, minute=0, second=0, microsecond=0
        )

        return {
            "calendar_event_id": event_id,
            "scheduled_time": scheduled_time.isoformat() + "Z",
            "title": title,
            "attendees": [customer_email, "sales-agent@company.com"],
            "status": "CONFIRMED",
            "message": f"Follow-up calendar invite '{title}' scheduled for {scheduled_time.strftime('%Y-%m-%d %H:%M:%S')}.",
        }
