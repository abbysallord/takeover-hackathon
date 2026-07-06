import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.models.database import get_db

router = APIRouter(tags=["Knowledge"])


@router.get("/knowledge/files", response_model=List[Dict[str, Any]])
def get_knowledge_files() -> List[Dict[str, Any]]:
    """Lists all markdown technical and policy documents in the local RAG knowledge base."""
    from app.services.rag_service import rag_service
    files = []
    knowledge_dir = str(rag_service.knowledge_root)
    if not os.path.exists(knowledge_dir):
        return []

    for root, _, filenames in os.walk(knowledge_dir):
        for f in filenames:
            if f.endswith((".md", ".txt", ".csv", ".json")):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, knowledge_dir)
                files.append(
                    {
                        "name": f,
                        "path": rel_path,
                        "size_bytes": os.path.getsize(full_path),
                        "category": os.path.basename(root),
                    }
                )
    return files


@router.post("/knowledge/upload")
async def upload_knowledge_file(
    category: str = "general",
    file: UploadFile = File(...),
) -> Dict[str, Any]:
    """Uploads a markdown/text document into the knowledge base, triggering RAG re-indexing."""
    if not file.filename.endswith((".md", ".txt", ".csv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only Markdown (.md), Plain Text (.txt), and CSV (.csv) files are supported.",
        )

    # Place files under knowledge/products, knowledge/pricing, knowledge/policies, or knowledge/general
    from app.services.rag_service import rag_service
    target_dir = os.path.join(rag_service.knowledge_root, category)
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, file.filename)

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Mark RAG retriever for re-indexing
        from app.services.rag_service import rag_service
        rag_service._is_initialized = False

        return {
            "success": True,
            "filename": file.filename,
            "category": category,
            "message": "File uploaded and indexed successfully.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save and index file: {str(e)}",
        )


@router.delete("/knowledge/files/{category}/{filename}")
def delete_knowledge_file(category: str, filename: str) -> Dict[str, Any]:
    """Deletes a document from the RAG knowledge base, triggering re-indexing."""
    # Sanitize inputs to prevent path traversal
    category = "".join(c for c in category if c.isalnum() or c in ("-", "_"))
    filename = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_"))
    
    from app.services.rag_service import rag_service
    file_path = os.path.join(rag_service.knowledge_root, category, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {filename} not found in category {category}.",
        )
        
    try:
        os.remove(file_path)
        # Mark RAG retriever for re-indexing
        from app.services.rag_service import rag_service
        rag_service._is_initialized = False
        
        return {
            "success": True,
            "message": f"File '{filename}' successfully deleted from knowledge base.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}",
        )


@router.get("/knowledge/files/{category}/{filename}")
def get_knowledge_file_content(category: str, filename: str) -> Dict[str, Any]:
    """Retrieves the raw text content of a document from the knowledge base."""
    category = "".join(c for c in category if c.isalnum() or c in ("-", "_"))
    filename = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_"))
    
    from app.services.rag_service import rag_service
    file_path = os.path.join(rag_service.knowledge_root, category, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {filename} not found in category {category}.",
        )
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file: {str(e)}",
        )
