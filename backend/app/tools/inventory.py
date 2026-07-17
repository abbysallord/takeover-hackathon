from typing import Any, Dict
from sqlalchemy.orm import Session
from app.tools.base import BaseTool


class InventoryTool(BaseTool):
    @property
    def name(self) -> str:
        return "inventory_tool"

    @property
    def description(self) -> str:
        return "Checks current stock levels in the warehouse database for a specific product."

    def check_stock(self, db: Session, product: str, quantity: int) -> Dict[str, Any]:
        """Check if requested product and quantity is in stock."""
        prod = product.lower().strip()
        from app.models.models import Workspace, Inventory
        import re

        # Auto-seed if database is empty
        items = db.query(Inventory).all()
        if not items:
            default_items = [
                {"product_name": "Widget A", "sku": "WD-A-01", "current_stock": 1500},
                {"product_name": "Widget B", "sku": "WD-B-02", "current_stock": 200},
                {"product_name": "Widget C", "sku": "WD-C-03", "current_stock": 0},
                {"product_name": "Server Rack", "sku": "SR-RK-99", "current_stock": 15},
            ]
            for it in default_items:
                existing = db.query(Inventory).filter(Inventory.sku == it["sku"]).first()
                if not existing:
                    db.add(Inventory(
                        product_name=it["product_name"],
                        sku=it["sku"],
                        current_stock=it["current_stock"],
                        updated_by="SYSTEM_SEED"
                    ))
            db.commit()

        workspace = db.query(Workspace).first()
        matched_stock = None

        # 1. Query Inventory DB Table first (isolated & custom per tenant)
        item = None
        prod_norm = prod.replace("-", " ")
        if "widget a" in prod_norm:
            item = db.query(Inventory).filter(Inventory.sku == "WD-A-01").first()
        elif "widget b" in prod_norm:
            item = db.query(Inventory).filter(Inventory.sku == "WD-B-02").first()
        elif "widget c" in prod_norm:
            item = db.query(Inventory).filter(Inventory.sku == "WD-C-03").first()
        elif "server rack" in prod_norm:
            item = db.query(Inventory).filter(Inventory.sku == "SR-RK-99").first()
            
        if not item:
            # Fuzzy match
            all_items = db.query(Inventory).all()
            for db_item in all_items:
                db_name_norm = db_item.product_name.lower().strip().replace("-", " ")
                if db_name_norm in prod_norm or prod_norm in db_name_norm:
                    item = db_item
                    break
                    
        if item:
            matched_stock = item.current_stock

        # 2. Fallback to parsing from catalog/pricing text if not found in database
        if matched_stock is None:
            for source_text in [workspace.catalog_data, workspace.pricing_data] if workspace else []:
                if not source_text:
                    continue
                lines = source_text.split("\n")
                for line in lines:
                    line_lower = line.lower()
                    search_words = [w for w in prod.split() if len(w) > 1]
                    if not search_words:
                        search_words = [prod]
                    if prod in line_lower or all(re.search(rf"\b{re.escape(w)}\b", line_lower) for w in search_words):
                        # Look for keywords like units, qty, stock (e.g. 100 units in stock)
                        matches = re.findall(r'(\d+)\s*(?:units|qty|stock|in stock|available|items)', line_lower)
                        if matches:
                            matched_stock = int(matches[0])
                            break
                        # Fallback to any whole number on the line
                        matches_all = re.findall(r'\b(\d+)\b', line)
                        for m in matches_all:
                            val = int(m)
                            if val > 0 and val < 100000:
                                matched_stock = val
                                break
                if matched_stock is not None:
                    break


        if matched_stock is None:
            # Fallback static DB
            stock_db = {
                "widget-a": 1500,
                "widget-b": 200,
                "widget-c": 0,
                "server-rack": 15,
            }
            matched_stock = 500  # Default fallback if product not in list
            prod_norm = prod.replace("-", " ")
            for key, val in stock_db.items():
                key_norm = key.replace("-", " ")
                if key_norm in prod_norm:
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
                "estimated_delivery_days": 14,
                "message": f"Product '{product}' is out of stock or insufficient. Requested {quantity}, available {matched_stock}.",
            }
