from typing import Any, Dict
from app.tools.base import BaseTool


class InventoryTool(BaseTool):
    @property
    def name(self) -> str:
        return "inventory_tool"

    @property
    def description(self) -> str:
        return "Checks current stock levels in the warehouse database for a specific product."

    def check_stock(self, product: str, quantity: int) -> Dict[str, Any]:
        """Check if requested product and quantity is in stock.

        Currently mocked for hackathon demo. Returns stock levels and estimated shipping times.
        """
        # Lowercase for simple checking
        prod = product.lower()

        # Mock stock data
        stock_db = {
            "widget-a": 1500,
            "widget-b": 80,
            "widget-c": 0,  # Out of stock
            "server-rack": 15,
        }

        # Find partial matches
        matched_stock = 500  # Default fallback if product not in list
        for key, val in stock_db.items():
            if key in prod:
                matched_stock = val
                break

        if matched_stock >= quantity:
            return {
                "in_stock": True,
                "available_quantity": matched_stock,
                "estimated_delivery_days": 2,
                "message": f"Product '{product}' is available. {matched_stock} units in warehouse.",
            }
        else:
            return {
                "in_stock": False,
                "available_quantity": matched_stock,
                "estimated_delivery_days": 14,  # Re-order delay
                "message": f"Product '{product}' is out of stock or insufficient. Requested {quantity}, available {matched_stock}.",
            }
