import random
import string
from typing import Any, Dict, Optional
from app.tools.base import BaseTool


class EmailTool(BaseTool):
    @property
    def name(self) -> str:
        return "email_tool"

    @property
    def description(self) -> str:
        return "Dispatches professional outbound emails and handles invoice/quote document distribution."

    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        attachment_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dispatches an outbound email to a client."""
        # Generate a mock message ID
        random_suffix = "".join(
            random.choices(string.ascii_lowercase + string.digits, k=12)
        )
        message_id = f"msg_{random_suffix}@mail.takeover.com"

        return {
            "message_id": message_id,
            "status": "DELIVERED",
            "to": to_email,
            "subject": subject,
            "body": body,
            "has_attachment": attachment_name is not None,
            "attachment_name": attachment_name,
            "message": f"Outbound email sent to {to_email} successfully (ID: {message_id}).",
        }
