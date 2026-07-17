import os
import httpx
from typing import Any, Dict
from app.tools.base import BaseTool

class WhatsAppTool(BaseTool):
    @property
    def name(self) -> str:
        return "whatsapp_tool"

    @property
    def description(self) -> str:
        return "Sends follow-up notifications and quotes to the customer's WhatsApp."

    def send_notification(self, phone: str, message: str) -> Dict[str, Any]:
        """Calls the Node.js Express sidecar to send a WhatsApp message."""
        service_url = os.getenv("WHATSAPP_SERVICE_URL", "https://smart-jeans-yawn.loca.lt")
        url = f"{service_url}/messages/send"
        try:
            headers = {"Bypass-Tunnel-Reminder": "true"}
            res = httpx.post(url, json={"phone": phone, "message": message}, headers=headers, timeout=10.0)
            if res.status_code == 200:
                return {"success": True, "data": res.json()}
            else:
                return {"success": False, "error": f"Service returned status {res.status_code}: {res.text}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
