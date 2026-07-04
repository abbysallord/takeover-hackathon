import random
from typing import Any, Dict
from app.tools.base import BaseTool


class CRMTool(BaseTool):
    @property
    def name(self) -> str:
        return "crm_tool"

    @property
    def description(self) -> str:
        return (
            "Creates and synchronizes lead records inside the company's CRM platform."
        )

    def create_or_update_lead(
        self, customer_name: str, email: str, company: str, value: float
    ) -> Dict[str, Any]:
        """Creates or updates a sales opportunity lead in the CRM database."""
        # Simple mock response
        lead_id = random.randint(10000, 99999)
        return {
            "crm_lead_id": lead_id,
            "status": "QUALIFIED_LEAD",
            "customer_name": customer_name,
            "company": company,
            "email": email,
            "deal_value": value,
            "synchronized": True,
            "message": f"Successfully created lead #{lead_id} for '{company}' with deal value ${value:.2f}.",
        }
