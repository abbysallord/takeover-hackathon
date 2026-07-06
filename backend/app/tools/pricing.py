from typing import Any, Dict
from sqlalchemy.orm import Session
from app.tools.base import BaseTool


class PricingTool(BaseTool):
    @property
    def name(self) -> str:
        return "pricing_tool"

    @property
    def description(self) -> str:
        return "Retrieves pricing and discount rules based on product name and requested volume."

    def get_pricing(self, db: Session, product: str, quantity: int) -> Dict[str, Any]:
        """Calculates item pricing, unit costs, and volume-based discounts."""
        prod = product.lower().strip()

        # 1. Fetch dynamic workspace catalog
        from app.models.models import Workspace
        import re

        workspace = db.query(Workspace).first()
        base_price = None
        matched_product = product.strip().title()

        # Try to parse price from pricing_data first, then catalog_data
        for source_text in [workspace.pricing_data, workspace.catalog_data] if workspace else []:
            if not source_text:
                continue
            lines = source_text.split("\n")
            for line in lines:
                if prod in line.lower() or any(word in line.lower() for word in prod.split()):
                    # Extract dollar price (e.g. $10.00)
                    matches = re.findall(r'\$\s*(\d+(?:\.\d{1,2})?)', line)
                    if not matches:
                        matches = re.findall(r'\b(\d+(?:\.\d{1,2})?)\b', line)
                    if matches:
                        try:
                            val = float(matches[0])
                            if val > 0.0:
                                base_price = val
                                # Clean product label
                                matched_product = line.split(":")[0].split("-")[0].strip().title()
                                break
                        except ValueError:
                            pass
            if base_price is not None:
                break

        # Fallback to static pricing DB if not found in custom catalogs
        if base_price is None:
            pricing_db = {
                "widget-a": 10.0,
                "widget-b": 45.0,
                "widget-c": 120.0,
                "server-rack": 850.0,
            }
            base_price = 25.0  # Fallback unit price
            matched_product = "Generic Item"
            for key, val in pricing_db.items():
                if key in prod:
                    base_price = val
                    matched_product = key.replace("-", " ").title()
                    break

        # Volume Discount Rules:
        # Quantity >= 100 -> 10% discount
        # Quantity >= 500 -> 20% discount
        discount_rate = 0.0
        if quantity >= 500:
            discount_rate = 0.20
        elif quantity >= 100:
            discount_rate = 0.10

        unit_price = base_price * (1 - discount_rate)
        total_amount = unit_price * quantity

        return {
            "product_name": matched_product,
            "quantity": quantity,
            "base_unit_price": base_price,
            "discount_applied": discount_rate,
            "unit_price": unit_price,
            "total_amount": total_amount,
            "currency": "USD",
        }
