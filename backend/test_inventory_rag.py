import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "app")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Use a test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_inventory_rag.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.models.database import Base
from app.models.models import Inventory, Workspace
from app.services.inventory_sync_service import sync_inventory_from_knowledge
from app.services.rag_service import rag_service

def test_inventory_sync_and_gating():
    # Setup database
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    try:
        # Create a workspace
        ws = Workspace(
            company_name="Test Company",
            business_email="test@company.com",
            industry="Technology",
            gmail_connected=False,
            passcode_hash="fake"
        )
        db.add(ws)
        db.commit()
        
        # Test content matching catalog.md
        catalog_content = """
# Company Product Catalog

## 1. Widget A
*   **SKU**: WD-A-01
*   **Description**: High-durability standard hardware widget designed for electronics.
*   **Availability**: In Stock

## 2. Widget B
*   **SKU**: WD-B-02
*   **Description**: Advanced electronic widget with micro-relays. Used in robotics.
*   **Availability**: Low Stock

## 3. Widget C
*   **SKU**: WD-C-03
*   **Description**: Premium industrial grade widget featuring titanium coating.
*   **Availability**: Out of Stock

## 4. Server Rack
*   **SKU**: SR-RK-99
*   **Description**: 42U industrial network server rack cabinet with smart PDU.
*   **Availability**: 2 days assembly
        """
        
        # Run sync_inventory_from_knowledge using fallback parser
        sync_inventory_from_knowledge(db, catalog_content)
        
        # Verify db contents
        items = db.query(Inventory).all()
        print(f"DEBUG: Found {len(items)} items in database inventory:")
        for item in items:
            print(f"  SKU: {item.sku}, Name: {item.product_name}, Stock: {item.current_stock}, Updated By: {item.updated_by}")
            
        assert len(items) == 4, f"Expected 4 items, got {len(items)}"
        
        # Verify specific stocks
        item_a = db.query(Inventory).filter(Inventory.sku == "WD-A-01").first()
        assert item_a.current_stock == 1500, f"Expected Widget A stock 1500, got {item_a.current_stock}"
        
        item_c = db.query(Inventory).filter(Inventory.sku == "WD-C-03").first()
        assert item_c.current_stock == 0, f"Expected Widget C stock 0, got {item_c.current_stock}"
        
        print("[PASS] Inventory Sync test passed!")
        
        # Test RAG Gating
        import app.models.database
        old_session_local = app.models.database.SessionLocal
        app.models.database.SessionLocal = TestingSessionLocal
        
        try:
            # Seed document chunks in RAG documents
            rag_service.documents = [
                {
                    "text": "Widget A SKU: WD-A-01 is in stock. Price is $10.00.",
                    "source": "products/catalog.md",
                    "category": "products",
                    "embedding": None
                },
                {
                    "text": "Widget C SKU: WD-C-03 is premium. Price is $50.00.",
                    "source": "products/catalog.md",
                    "category": "products",
                    "embedding": None
                }
            ]
            rag_service._is_initialized = True
            
            # Retrieve query matching Widget A
            res_a = rag_service.retrieve("Widget A", top_k=5)
            print(f"DEBUG: RAG search for 'Widget A' returned {len(res_a)} results:")
            for r in res_a:
                print(f"  Source: {r['source']}, Text: {r['text']}")
            assert len(res_a) > 0, "Expected at least 1 chunk for Widget A"
            
            # Retrieve query matching Widget C (out of stock)
            res_c = rag_service.retrieve("Widget C", top_k=5)
            print(f"DEBUG: RAG search for 'Widget C' returned {len(res_c)} results:")
            for r in res_c:
                print(f"  Source: {r['source']}, Text: {r['text']}")
            
            # Verify that none of the retrieved chunks mention Widget C or WD-C-03
            for r in res_c:
                text_lower = r["text"].lower()
                assert "widget c" not in text_lower and "wd-c-03" not in text_lower, "Out of stock product details should be excluded!"
            
            print("[PASS] RAG Gating test passed!")
            
            # Update Widget C stock to 100 and check that it is retrieved
            item_c.current_stock = 100
            db.commit()
            
            res_c_updated = rag_service.retrieve("Widget C", top_k=5)
            print(f"DEBUG: RAG search for 'Widget C' after stock update returned {len(res_c_updated)} results:")
            assert len(res_c_updated) > 0, "Expected at least 1 chunk for Widget C after stock update"
            print("[PASS] RAG Gating Dynamic Recovery test passed!")
            
        finally:
            app.models.database.SessionLocal = old_session_local
            
    finally:
        db.close()
        engine.dispose()
        if os.path.exists("test_inventory_rag.db"):
            try:
                os.remove("test_inventory_rag.db")
            except Exception as delete_ex:
                print(f"DEBUG: Could not delete test DB: {delete_ex}")

if __name__ == "__main__":
    test_inventory_sync_and_gating()
