from datetime import datetime
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    np = None


class RAGService:
    """Lightweight in-memory vector store and retrieval-augmented generation document parser."""

    def __init__(self, knowledge_root: Optional[str] = None) -> None:
        import os
        default_root = Path("/tmp/knowledge") if os.name != "nt" else Path(__file__).resolve().parent.parent.parent / "knowledge"
        self.base_knowledge_root = Path(knowledge_root or default_root)
        self._model: Optional[Any] = None
        self._model_loading_failed = False
        self.documents_by_session: Dict[Optional[str], List[Dict[str, Any]]] = {}
        self.initialized_sessions: Dict[Optional[str], bool] = {}

    @property
    def knowledge_root(self) -> Path:
        from app.models.database import tenant_session_id
        session_id = tenant_session_id.get()
        if session_id:
            return self.base_knowledge_root / f"session_{session_id}"
        return self.base_knowledge_root

    @property
    def documents(self) -> List[Dict[str, Any]]:
        from app.models.database import tenant_session_id
        sid = tenant_session_id.get()
        if sid not in self.documents_by_session:
            self.documents_by_session[sid] = []
        return self.documents_by_session[sid]

    @documents.setter
    def documents(self, value: List[Dict[str, Any]]) -> None:
        from app.models.database import tenant_session_id
        sid = tenant_session_id.get()
        self.documents_by_session[sid] = value

    @property
    def _is_initialized(self) -> bool:
        from app.models.database import tenant_session_id
        sid = tenant_session_id.get()
        return self.initialized_sessions.get(sid, False)

    @_is_initialized.setter
    def _is_initialized(self, value: bool) -> None:
        from app.models.database import tenant_session_id
        sid = tenant_session_id.get()
        self.initialized_sessions[sid] = value

    @property
    def model(self) -> Any:
        """Lazily initialize the sentence-transformer embedding model to save startup latency."""
        if self._model is None and HAS_SENTENCE_TRANSFORMERS and not self._model_loading_failed:
            try:
                # Force local files only to avoid online verification attempts on network-restricted hosts
                self._model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
            except Exception as e:
                print(f"⚠️ Error loading SentenceTransformer locally: {e}. Trying online load...")
                try:
                    self._model = SentenceTransformer("all-MiniLM-L6-v2")
                except Exception as ex:
                    print(f"⚠️ Failed loading SentenceTransformer online: {ex}. Bypassing vector model for session.")
                    self._model_loading_failed = True
        return self._model

    def initialize_store(self) -> None:
        """Reads local catalog, pricing, and policy documents, chunks them, and generates embeddings."""
        if self._is_initialized:
            return

        self.documents = []

        # Writable tmp path compatibility: Auto-copy default policy docs if they are not in the current target path
        src_root = Path(__file__).resolve().parent.parent.parent / "knowledge"
        if src_root.exists() and src_root.resolve() != self.knowledge_root.resolve():
            import shutil
            import os
            try:
                for file_path in src_root.glob("**/*"):
                    if file_path.is_file() and file_path.suffix in [".md", ".txt"]:
                        # Exclude other sessions' directories that might reside in the template folder
                        parts = file_path.relative_to(src_root).parts
                        if any(part.startswith("session_") for part in parts):
                            continue
                            
                        # Compute relative path
                        rel_path = file_path.relative_to(src_root)
                        dest_path = self.knowledge_root / rel_path
                        if not dest_path.exists():
                            os.makedirs(dest_path.parent, exist_ok=True)
                            shutil.copy2(file_path, dest_path)
            except Exception as e:
                print(f"⚠️ Failed to copy default policies to dynamic knowledge root: {e}")

        if not self.knowledge_root.exists():
            print(f"⚠️ Knowledge root directory {self.knowledge_root} does not exist. Empty RAG context.")
            self._is_initialized = True
            return

        # Scan for markdown and text files
        for file_path in self.knowledge_root.glob("**/*"):
            if file_path.is_file() and file_path.suffix in [".md", ".txt"]:
                category = file_path.parent.name
                source_name = file_path.name
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # Simple paragraph/section chunking
                    chunks = [c.strip() for c in content.split("\n\n") if c.strip()]
                    
                    for chunk in chunks:
                        doc = {
                            "text": chunk,
                            "source": f"{category}/{source_name}",
                            "category": category,
                            "embedding": None
                        }
                        
                        # Generate embedding if model is available
                        if self.model:
                            try:
                                doc["embedding"] = self.model.encode(chunk)
                            except Exception as e:
                                print(f"⚠️ Failed to encode chunk: {e}")
                                
                        self.documents.append(doc)
                except Exception as e:
                    print(f"⚠️ Error parsing file {file_path}: {e}")

        print(f"📊 RAG Indexed {len(self.documents)} document chunks from {self.knowledge_root}")
        self._is_initialized = True

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Queries the vector index using cosine similarity and returns top matches.

        Falls back to keyword matching if embedding models are not available.
        """
        self.initialize_store()
        
        if not self.documents:
            return []

        results = []

        # Case 1: Embeddings are available
        if self.model and HAS_NUMPY and any(doc["embedding"] is not None for doc in self.documents):
            try:
                query_embedding = self.model.encode(query)
                matches = []
                
                for doc in self.documents:
                    if doc["embedding"] is not None:
                        # Cosine similarity calculation
                        a = query_embedding
                        b = doc["embedding"]
                        sim = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
                        matches.append((doc, float(sim)))
                
                # Sort by similarity score descending
                matches.sort(key=lambda x: x[1], reverse=True)
                results = [
                    {**item[0], "score": item[1]}
                    for item in matches[:top_k]
                ]
            except Exception as e:
                print(f"⚠️ Vector search failed: {e}. Falling back to keyword fallback.")

        # Case 2: Fallback to keyword-based relevance matching
        if not results:
            query_words = set(query.lower().split())
            matches = []
            
            for doc in self.documents:
                doc_words = doc["text"].lower()
                # Simple match score (count overlapping keywords)
                score = sum(1 for word in query_words if word in doc_words)
                if score > 0:
                    # Normalize by query length
                    norm_score = score / len(query_words)
                    matches.append(({**doc, "score": norm_score}, norm_score))
                    
            matches.sort(key=lambda x: x[1], reverse=True)
            results = [item[0] for item in matches[:top_k]]

        # Live Dynamic Database Override to prevent context divergence & gate out-of-stock items
        if results:
            from app.models.database import get_tenant_db
            from app.models.models import Inventory
            db = get_tenant_db()
            try:
                db_items = db.query(Inventory).all()
                if db_items:
                    db_map = {item.sku.lower(): item for item in db_items}
                    filtered_results = []
                    
                    for res in results:
                        text_lower = res["text"].lower()
                        
                        # Check if this document chunk references a product in the inventory
                        matched_in_inventory = False
                        has_stock = False
                        
                        for sku, item in db_map.items():
                            prod_name_lower = item.product_name.lower().strip()
                            if sku in text_lower or prod_name_lower in text_lower:
                                matched_in_inventory = True
                                if item.current_stock > 0:
                                    has_stock = True
                        
                        # GATING RULE: If the chunk matches a product, but that product has NO stock,
                        # we exclude this chunk from RAG results. This triggers the AI flow to bypass.
                        if matched_in_inventory and not has_stock:
                            print(f"[RAG Gating] Excluded chunk from '{res['source']}' because product is out of stock.")
                            continue
                        
                        overrides = []
                        for sku, item in db_map.items():
                            prod_name_lower = item.product_name.lower().strip()
                            if sku in text_lower or prod_name_lower in text_lower:
                                overrides.append(
                                    f"[LIVE SYSTEM OVERRIDE: SKU '{item.sku}' ({item.product_name}) - stock: {item.current_stock} available units]"
                                )
                        if overrides:
                            res["text"] += "\n\n" + "\n".join(overrides)
                        
                        filtered_results.append(res)
                    results = filtered_results
            except Exception as ex:
                print(f"[WARNING] RAG dynamic override check failed: {ex}")
            finally:
                db.close()

        return results


    def get_formatted_context(self, query: str, top_k: int = 3) -> str:
        """Retrieves and formats top matches as a single string block for LLM prompts."""
        results = self.retrieve(query, top_k=top_k)
        if not results:
            return "No matching company documentation found in knowledge base."
            
        context_blocks = []
        for res in results:
            context_blocks.append(
                f"--- Source: {res['source']} (Relevance: {res.get('score', 0.0):.2f}) ---\n"
                f"{res['text']}"
            )
        return "\n\n".join(context_blocks)


# Export a global instance
rag_service = RAGService()
