import json
import re
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.models.models import Inventory, Notification
from app.core.provider import llm_provider

def sync_inventory_from_knowledge(db: Session, file_content: str) -> None:
    """Parses product catalog/stock details from knowledge files using LLM and updates the database Inventory table."""
    # Safety guard: if the file is extremely short or doesn't seem to contain product/stock data, skip it
    if len(file_content.strip()) < 20:
        return

    # Check if the content contains mentions of products or stock
    lower_content = file_content.lower()
    has_signals = any(sig in lower_content for sig in ["sku", "stock", "qty", "quantity", "availability", "widget", "server rack"])
    if not has_signals:
        print("[WARNING] No product or stock signals found in file content. Skipping inventory sync.")
        return

    try:
        prompt = f"""
You are a database data extraction assistant. Analyze the following document text representing a product catalog or stock list.
Extract all products, their SKUs, and their current stock levels.

If a stock level is represented qualitatively (e.g., "In Stock", "Available", "Low Stock", "Out of Stock"), map it to these numbers:
- "In Stock", "Available": 1500
- "Low Stock": 200
- "Out of Stock", "Low Stock / Out of Stock": 0
- "2 days assembly" or "Made to order": 15

If a quantitative stock level is specified (e.g., "Stock: 45", "Quantity: 120", "12 units left"), extract that number exactly.

Provide your output as a raw JSON array of objects, with NO markdown formatting, NO ```json blocks, just the JSON array.
Each object must have:
- "product_name": string
- "sku": string (standardized alphanumeric identifier, e.g. WD-A-01, WD-B-02, WD-C-03, SR-RK-99)
- "current_stock": integer

Text to analyze:
{file_content}
"""
        is_mock = llm_provider.is_mock_key()
        items = []

        if not is_mock:
            try:
                response_text = llm_provider.generate(prompt, temperature=0.1)
                
                # Clean markdown wrappers if present
                clean_json = response_text.strip()
                if clean_json.startswith("```"):
                    lines = clean_json.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    clean_json = "\n".join(lines).strip()

                # Remove potential surrounding formatting
                if not clean_json.startswith("[") and "[" in clean_json:
                    clean_json = clean_json[clean_json.find("["):]
                if not clean_json.endswith("]") and "]" in clean_json:
                    clean_json = clean_json[:clean_json.rfind("]")+1]
                    
                items = json.loads(clean_json)
            except Exception as json_err:
                print(f"[WARNING] Failed to parse LLM response as JSON: {json_err}. Falling back to regex.")
                is_mock = True

        if is_mock or not isinstance(items, list):
            # Regex fallback parser
            items = []
            blocks = re.split(r"##\s+\d+\.", file_content)
            for block in blocks:
                name_match = re.search(r"^\s*([^\n]+)", block)
                sku_match = re.search(r"sku\*\*:\s*([^\n]+)", block, re.IGNORECASE)
                avail_match = re.search(r"availability\*\*:\s*([^\n]+)", block, re.IGNORECASE)
                if sku_match and name_match:
                    name = name_match.group(1).strip()
                    sku = sku_match.group(1).strip().replace("*", "").replace("`", "")
                    avail = avail_match.group(1).strip() if avail_match else "In Stock"
                    
                    stock = 1500
                    if "out of stock" in avail.lower():
                        stock = 0
                    elif "low stock" in avail.lower():
                        stock = 200
                    elif "assembly" in avail.lower():
                        stock = 15
                    
                    items.append({
                        "product_name": name,
                        "sku": sku,
                        "current_stock": stock
                    })

        if not isinstance(items, list) or len(items) == 0:
            print("[WARNING] Could not parse any products or stocks from catalog file.")
            return
            
        updated_any = False
        for item in items:
            sku = item.get("sku")
            name = item.get("product_name")
            stock = item.get("current_stock")
            
            if not sku or not name or stock is None:
                continue
                
            # Basic normalization
            sku = sku.strip().replace("*", "").replace("`", "")
            name = name.strip().replace("*", "").replace("`", "")
            
            # Find and update or create
            existing = db.query(Inventory).filter(Inventory.sku == sku).first()
            if existing:
                old_stock = existing.current_stock
                existing.product_name = name
                existing.current_stock = stock
                existing.updated_by = "KNOWLEDGE_SYNC"
                print(f"[KNOWLEDGE SYNC] Updated inventory item {sku}: {old_stock} -> {stock}")
                
                # If stock transitioned to 0, create a warning notification
                if old_stock > 0 and stock == 0:
                    notif = Notification(
                        type="SYSTEM_ERROR",
                        message=f"Warning: Product {name} ({sku}) is now OUT OF STOCK. Emails regarding this product will be automatically ignored.",
                        read=False
                    )
                    db.add(notif)
            else:
                db.add(Inventory(
                    product_name=name,
                    sku=sku,
                    current_stock=stock,
                    updated_by="KNOWLEDGE_SYNC"
                ))
                print(f"[KNOWLEDGE SYNC] Added new inventory item {sku}: {stock}")
            
            updated_any = True

        if updated_any:
            db.commit()
            print("[SUCCESS] Inventory successfully synchronized from knowledge base document.")
    except Exception as e:
        print(f"[ERROR] Failed to sync inventory from knowledge: {e}")
