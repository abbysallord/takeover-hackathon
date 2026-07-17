import os
import unittest
import hashlib
from fastapi.testclient import TestClient

# Set database url to test db before imports
os.environ["DATABASE_URL"] = "sqlite:///./test_drafts.db"

from app.main import app
from app.models.database import SessionLocal
from app.models.models import Workspace

class TestKnowledgeDrafts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # Clean old test db
        if os.path.exists("test_drafts.db"):
            try:
                os.remove("test_drafts.db")
            except Exception:
                pass
            
        # Initialize database and create workspace
        from app.models.database import Base, engine
        Base.metadata.create_all(bind=engine)
        
        # Create a workspace with a passcode
        db = SessionLocal()
        workspace = Workspace(
            company_name="Test Company",
            business_email="sales@test.com",
            industry="Testing",
            passcode_hash=hashlib.sha256("1234".encode("utf-8")).hexdigest(),
            onboarding_completed=True
        )
        db.add(workspace)
        db.commit()
        db.close()
        
        # Create a dummy knowledge file
        from app.services.rag_service import rag_service
        cls.test_dir = os.path.join(rag_service.knowledge_root, "products")
        os.makedirs(cls.test_dir, exist_ok=True)
        cls.test_file_path = os.path.join(cls.test_dir, "widget_test.md")
        with open(cls.test_file_path, "w", encoding="utf-8") as f:
            f.write("Widget Test: $10.00\nStock: 100\n")

    @classmethod
    def tearDownClass(cls):
        # Remove dummy file
        if os.path.exists(cls.test_file_path):
            try:
                os.remove(cls.test_file_path)
            except Exception:
                pass
        # Remove database
        if os.path.exists("test_drafts.db"):
            try:
                os.remove("test_drafts.db")
            except Exception:
                pass

    def test_draft_lifecycle(self):
        # 1. Propose edit
        payload = {
            "category": "products",
            "filename": "widget_test.md",
            "instruction": "replace $10.00 with $12.05"
        }
        res = self.client.post("/knowledge/propose-edit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("Widget Test: $12.05", data["proposed_content"])
        
        # Verify draft is in database
        res_drafts = self.client.get("/knowledge/drafts")
        self.assertEqual(res_drafts.status_code, 200)
        drafts = res_drafts.json()
        self.assertEqual(len(drafts), 1)
        self.assertEqual(drafts[0]["filename"], "widget_test.md")
        self.assertIn("Widget Test: $12.05", drafts[0]["draft_content"])
        
        # Verify file content endpoint returns draft data
        res_file = self.client.get("/knowledge/files/products/widget_test.md")
        self.assertEqual(res_file.status_code, 200)
        file_data = res_file.json()
        self.assertIsNotNone(file_data["draft"])
        self.assertEqual(file_data["draft"]["draft_content"], drafts[0]["draft_content"])
        
        # 2. Apply edit with invalid passcode
        apply_payload = {
            "category": "products",
            "filename": "widget_test.md",
            "proposed_content": file_data["draft"]["draft_content"],
            "instruction": "replace $10.00 with $12.05",
            "passcode": "wrong"
        }
        res_apply_fail = self.client.post("/knowledge/apply-edit", json=apply_payload)
        self.assertEqual(res_apply_fail.status_code, 401)
        
        # 3. Apply edit with correct passcode
        apply_payload["passcode"] = "1234"
        res_apply_success = self.client.post("/knowledge/apply-edit", json=apply_payload)
        self.assertEqual(res_apply_success.status_code, 200)
        
        # Verify file actually updated on disk
        with open(self.test_file_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("Widget Test: $12.05", content)
        
        # Verify draft deleted
        res_drafts = self.client.get("/knowledge/drafts")
        drafts = res_drafts.json()
        self.assertEqual(len(drafts), 0)
        
        # 4. Discard draft test: propose edit again
        res = self.client.post("/knowledge/propose-edit", json=payload)
        self.assertEqual(res.status_code, 200)
        
        # Discard the draft
        discard_payload = {
            "category": "products",
            "filename": "widget_test.md"
        }
        res_discard = self.client.post("/knowledge/discard-draft", json=discard_payload)
        self.assertEqual(res_discard.status_code, 200)
        
        # Verify draft deleted again
        res_drafts = self.client.get("/knowledge/drafts")
        drafts = res_drafts.json()
        self.assertEqual(len(drafts), 0)

        # 5. Save draft directly (direct manual editing)
        direct_payload = {
            "category": "products",
            "filename": "widget_test.md",
            "draft_content": "Widget Test: $15.50\nStock: 99\n",
            "instruction": "Manual Direct Edit"
        }
        res_direct = self.client.post("/knowledge/draft", json=direct_payload)
        self.assertEqual(res_direct.status_code, 200)
        
        # Verify it lists in drafts
        res_drafts = self.client.get("/knowledge/drafts")
        drafts = res_drafts.json()
        self.assertEqual(len(drafts), 1)
        self.assertEqual(drafts[0]["draft_content"], "Widget Test: $15.50\nStock: 99\n")
        
        # Clean it up by discarding it
        res_discard = self.client.post("/knowledge/discard-draft", json=discard_payload)
        self.assertEqual(res_discard.status_code, 200)
        
        # Verify draft deleted
        res_drafts = self.client.get("/knowledge/drafts")
        drafts = res_drafts.json()
        self.assertEqual(len(drafts), 0)

if __name__ == "__main__":
    unittest.main()
