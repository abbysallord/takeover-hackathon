from typing import Any, Dict
from app.tools.base import BaseTool


class PricingTool(BaseTool):
    @property
    def name(self) -> str:
        return "pricing_tool"

    @property
    def description(self) -> str:
        return "Retrieves pricing and discount rules based on product name and requested volume."

    def get_pricing(self, product: str, quantity: int) -> Dict[str, Any]:
        """Calculates item pricing, unit costs, and volume-based discounts.

        Currently mocked for hackathon.
        """
        prod = product.lower()

        # Base unit prices
        pricing_db = {
            "widget-a": 10.0,
            "widget-b": 45.0,
            "widget-c": 120.0,
            "server-rack": 850.0,
        }

        # Find matching base price
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
