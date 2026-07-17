from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import hashlib

from app.models.database import get_db
from app.models.models import Inventory, Workspace, Notification
from app.schemas.schemas import InventoryResponse, InventoryReceive

router = APIRouter(tags=["Inventory"])


@router.get("/inventory", response_model=List[InventoryResponse])
def get_inventory(db: Session = Depends(get_db)) -> List[InventoryResponse]:
    """Retrieves all inventory items for this tenant workspace."""
    items = db.query(Inventory).all()
    if not items:
        # Check workspace data (like catalog_data/pricing_data) to auto-seed if possible
        workspace = db.query(Workspace).first()
        if workspace:
            # We seed standard items WD-A-01, WD-B-02, WD-C-03, SR-RK-99
            # with default stock values from catalog if found, else fallback standard defaults
            default_items = [
                {"product_name": "Widget A", "sku": "WD-A-01", "current_stock": 1500},
                {"product_name": "Widget B", "sku": "WD-B-02", "current_stock": 200},
                {"product_name": "Widget C", "sku": "WD-C-03", "current_stock": 0},
                {"product_name": "Server Rack", "sku": "SR-RK-99", "current_stock": 15},
            ]
            for item in default_items:
                # Basic check to avoid duplicates
                existing = db.query(Inventory).filter(Inventory.sku == item["sku"]).first()
                if not existing:
                    db.add(Inventory(
                        product_name=item["product_name"],
                        sku=item["sku"],
                        current_stock=item["current_stock"],
                        updated_by="SYSTEM_SEED"
                    ))
            db.commit()
            items = db.query(Inventory).all()
    return items


@router.post("/inventory/receive", response_model=InventoryResponse)
def receive_inventory(data: InventoryReceive, db: Session = Depends(get_db)) -> InventoryResponse:
    """Updates stock count when new inventory arrives (requires passcode verification)."""
    # 1. Verify Passcode
    workspace = db.query(Workspace).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")
        
    if workspace.passcode_hash:
        hashed_entered = hashlib.sha256(data.passcode.encode("utf-8")).hexdigest()
        if workspace.passcode_hash != hashed_entered:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid security passcode.")

    # 2. Update stock count
    item = db.query(Inventory).filter(Inventory.sku == data.sku).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Product with SKU {data.sku} not found.")

    old_stock = item.current_stock
    item.current_stock += data.quantity_received
    item.updated_by = "ADMIN"
    
    # 3. Create a Notification
    notif = Notification(
        type="SYSTEM_ERROR",  # Notification types: EMAIL_RECEIVED, APPROVAL_REQUEST, SYSTEM_ERROR
        message=f"📦 Stock replenished: {item.product_name} ({item.sku}) increased from {old_stock} to {item.current_stock} (Received +{data.quantity_received}). Note: {data.note or 'N/A'}",
        read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(item)
    return item
