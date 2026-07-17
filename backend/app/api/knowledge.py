import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.schemas.schemas import ProposeEditRequest, ProposeEditResponse, ApplyEditRequest

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


@router.post("/knowledge/propose-edit", response_model=ProposeEditResponse)
def propose_knowledge_edit(data: ProposeEditRequest) -> ProposeEditResponse:
    """Proposes an inline modification to a document using LLM or local fallback parser."""
    category = "".join(c for c in data.category if c.isalnum() or c in ("-", "_"))
    filename = "".join(c for c in data.filename if c.isalnum() or c in (".", "-", "_"))
    
    from app.services.rag_service import rag_service
    file_path = os.path.join(rag_service.knowledge_root, category, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {filename} not found in category {category}.",
        )
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            original_content = f.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file: {str(e)}",
        )

    # Generate proposal
    from app.core.provider import llm_provider
    
    if llm_provider.is_mock_key():
        proposed_content = mock_propose_edit_fallback(original_content, data.instruction)
    else:
        system_prompt = (
            "You are an expert technical editor. Your job is to modify the provided text based on the user's instructions.\n"
            "Ensure you return ONLY the fully modified file content. Do not add any conversational text, explanations, markdown code blocks (like ```markdown), or notes. Just output the content directly.\n\n"
            "Original Content:\n"
            "==================\n"
            f"{original_content}\n"
            "==================\n"
            "Instruction:\n"
            f"{data.instruction}\n"
        )
        try:
            proposed_content = llm_provider.generate(system_prompt)
            if proposed_content.strip().startswith("```"):
                lines = proposed_content.strip().split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                proposed_content = "\n".join(lines)
        except Exception as e:
            proposed_content = mock_propose_edit_fallback(original_content, data.instruction)

    # Compute diff
    import difflib
    diff_lines = list(difflib.unified_diff(
        original_content.splitlines(),
        proposed_content.splitlines(),
        fromfile='a/' + filename,
        tofile='b/' + filename,
        lineterm=''
    ))
    diff_summary = "\n".join(diff_lines)

    return ProposeEditResponse(
        success=True,
        original_content=original_content,
        proposed_content=proposed_content,
        diff_summary=diff_summary
    )


def mock_propose_edit_fallback(original_content: str, instruction: str) -> str:
    """Mock parser to simulate file editing when running with placeholder keys."""
    import re
    instr = instruction.lower()
    content = original_content
    
    # 1. Price changes (e.g. "Change Widget A price to $12")
    price_match = re.search(r"widget\s+([a-c]|a\s+&\s+b|c|a\s+and\s+b)\s+(?:price|pricing).*?(\d+(?:\.\d{2})?)", instr)
    if not price_match:
        price_match = re.search(r"([a-z\s]+?)\s+(?:price|pricing).*?(\d+(?:\.\d{2})?)", instr)
    if price_match:
        prod_name = price_match.group(1).strip()
        new_price = price_match.group(2)
        lines = content.split("\n")
        updated = False
        for i, line in enumerate(lines):
            if prod_name in line.lower() and ("$" in line or "price" in line.lower() or "base" in line.lower()):
                lines[i] = re.sub(r"\$\s*\d+(?:\.\d{1,2})?", f"${new_price}", line)
                updated = True
                break
        if updated:
            return "\n".join(lines)
            
    # 2. Stock changes (e.g. "Update stock of Widget A to 120")
    stock_match = re.search(r"widget\s+([a-c])\s+(?:stock|quantity|units).*?(\d+)", instr)
    if stock_match:
        prod_name = stock_match.group(1).strip()
        new_stock = stock_match.group(2)
        lines = content.split("\n")
        updated = False
        for i, line in enumerate(lines):
            if prod_name in line.lower() and ("stock" in line.lower() or "qty" in line.lower() or "available" in line.lower() or "units" in line.lower()):
                lines[i] = re.sub(r"\b\d+\b", new_stock, line)
                updated = True
                break
        if updated:
            return "\n".join(lines)

    # 3. Text replace "replace target with replacement"
    replace_match = re.search(r"replace\s+[\"']?(.*?)[\"']?\s+with\s+[\"']?(.*?)[\"']?$", instr)
    if replace_match:
        target = replace_match.group(1).strip()
        replacement = replace_match.group(2).strip()
        pattern = re.compile(re.escape(target), re.IGNORECASE)
        return pattern.sub(replacement, content)
        
    return content + f"\n\n<!-- Edit Applied: {instruction} -->"


@router.post("/knowledge/apply-edit")
def apply_knowledge_edit(data: ApplyEditRequest, db: Session = Depends(get_db)):
    """Applies the proposed edit, checks passcode security, updates RAG, and creates log/notification."""
    from app.models.models import Workspace, KnowledgeEditLog, Notification
    import hashlib
    
    workspace = db.query(Workspace).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")
        
    if workspace.passcode_hash:
        hashed_entered = hashlib.sha256(data.passcode.encode("utf-8")).hexdigest()
        if workspace.passcode_hash != hashed_entered:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid security passcode.")

    category = "".join(c for c in data.category if c.isalnum() or c in ("-", "_"))
    filename = "".join(c for c in data.filename if c.isalnum() or c in (".", "-", "_"))
    
    from app.services.rag_service import rag_service
    file_path = os.path.join(rag_service.knowledge_root, category, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {filename} not found in category {category}.",
        )

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(data.proposed_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write modifications to file: {str(e)}",
        )

    rag_service._is_initialized = False

    edit_log = KnowledgeEditLog(
        filename=filename,
        category=category,
        editor_identity="ADMIN",
        instruction=data.instruction,
        diff_summary=f"Changed file: {filename}",
        status="APPLIED"
    )
    db.add(edit_log)

    notif = Notification(
        type="KNOWLEDGE_UPDATED",
        message=f"📝 Knowledge base updated: {filename} in {category}. Instruction: '{data.instruction}'",
        read=False
    )
    db.add(notif)
    
    db.commit()
    return {"success": True, "message": f"Successfully updated document {filename}."}

