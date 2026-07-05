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
        self.knowledge_root = Path(knowledge_root or Path(__file__).resolve().parent.parent.parent / "knowledge")
        self._model: Optional[Any] = None
        self.documents: List[Dict[str, Any]] = []
        self._is_initialized = False

    @property
    def model(self) -> Any:
        """Lazily initialize the sentence-transformer embedding model to save startup latency."""
        if self._model is None and HAS_SENTENCE_TRANSFORMERS:
            try:
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                print(f"⚠️ Error loading SentenceTransformer: {e}. Falling back to keyword search.")
        return self._model

    def initialize_store(self) -> None:
        """Reads local catalog, pricing, and policy documents, chunks them, and generates embeddings."""
        if self._is_initialized:
            return

        self.documents = []
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
                return [
                    {**item[0], "score": item[1]}
                    for item in matches[:top_k]
                ]
            except Exception as e:
                print(f"⚠️ Vector search failed: {e}. Falling back to keyword fallback.")

        # Case 2: Fallback to keyword-based relevance matching
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
        return [item[0] for item in matches[:top_k]]

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
