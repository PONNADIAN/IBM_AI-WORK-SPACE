"""
routers/documents.py
--------------------
Document upload and analysis endpoints.
Supports: PDF, DOCX, TXT, CSV, Images
"""

import io
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.base import ChatMessage
from app.ai.factory import get_ai_provider
from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.services.document_processor import process_document

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/csv": "csv",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
}


class DocumentOut(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AnalyzeRequest(BaseModel):
    document_id: str
    action: str  # summarize|rewrite|translate|explain|questions|keypoints|ats_score|code_explain
    extra_instruction: Optional[str] = None
    target_language: Optional[str] = "English"


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    content_type = file.content_type or ""
    file_type = ALLOWED_TYPES.get(content_type)

    # Fallback: detect by extension
    if not file_type and file.filename:
        ext = Path(file.filename).suffix.lower()
        ext_map = {".pdf": "pdf", ".docx": "docx", ".txt": "txt",
                   ".csv": "csv", ".jpg": "image", ".jpeg": "image",
                   ".png": "image", ".webp": "image", ".gif": "image"}
        file_type = ext_map.get(ext)

    if not file_type:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {content_type}")

    # Read file
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(status_code=413, detail=f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB")

    # Save to disk
    upload_dir = Path(settings.UPLOAD_DIR) / current_user.id
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    file_path = upload_dir / safe_name
    file_path.write_bytes(content)

    # Extract text
    extracted_text = await process_document(content, file_type, file.filename)

    # Store in DB
    doc = Document(
        user_id=current_user.id,
        filename=safe_name,
        original_filename=file.filename,
        file_type=file_type,
        file_size=len(content),
        storage_path=str(file_path),
        extracted_text=extracted_text[:50000] if extracted_text else None,  # Limit stored text
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return DocumentOut(
        id=doc.id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        extracted_text=extracted_text[:2000] if extracted_text else None,  # Preview only
        summary=doc.summary,
        created_at=doc.created_at.isoformat(),
    )


@router.post("/analyze")
async def analyze_document(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == body.document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.extracted_text:
        raise HTTPException(status_code=400, detail="No text extracted from document")

    provider = get_ai_provider()

    action_prompts = {
        "summarize": """Analyze the document and provide exactly the following three sections:
1. A concise summary of the overall document.
2. 5-8 key concepts/bullets explaining the core ideas.
3. 3-5 suggested follow-up questions the user can ask to study this material better.
Use clear Markdown formatting with headings for each section.""",
        "rewrite": "Rewrite the following document to be clearer, more professional, and better structured.",
        "translate": f"Translate the following document to {body.target_language}. Keep the formatting.",
        "explain": "Explain this document in simple terms. Break down complex concepts.",
        "questions": "Generate 10 comprehensive questions based on this document for studying or interviews.",
        "keypoints": "Extract and list all key points, important facts, and main takeaways from this document.",
        "ats_score": """Analyze this resume/CV and provide:
1. ATS Compatibility Score (0-100)
2. Missing keywords for the industry
3. Skill gaps
4. Strengths
5. Specific improvement suggestions
6. 5 tailored interview questions""",
        "code_explain": "Explain this code in detail. Describe what it does, how it works, and any potential improvements.",
        "code_review": "Review this code for bugs, security issues, performance problems, and best practices.",
        "csv_insights": "Analyze this CSV data and provide statistical insights, trends, patterns, and key findings.",
    }

    base_prompt = action_prompts.get(body.action, "Analyze the following document:")
    if body.extra_instruction:
        base_prompt += f"\n\nAdditional instruction: {body.extra_instruction}"

    # Use first 15000 chars of extracted text to stay within token limits
    text_sample = doc.extracted_text[:15000]
    messages = [
        ChatMessage(role="user", content=f"{base_prompt}\n\n---\n\n{text_sample}")
    ]

    response = await provider.chat(
        messages,
        system_prompt="You are an expert document analyst. Provide thorough, structured, and actionable analysis.",
        max_tokens=3000,
    )

    # Cache summary if action is summarize
    if body.action == "summarize":
        doc.summary = response.content[:5000]
        db.commit()

    return {"result": response.content, "document_id": doc.id, "action": body.action}


@router.post("/analyze/stream")
async def analyze_document_stream(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == body.document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.extracted_text:
        raise HTTPException(status_code=400, detail="No text extracted from document")

    provider = get_ai_provider()

    action_prompts = {
        "summarize": """Analyze the document and provide exactly the following three sections:
1. A concise summary of the overall document.
2. 5-8 key concepts/bullets explaining the core ideas.
3. 3-5 suggested follow-up questions the user can ask to study this material better.
Use clear Markdown formatting with headings for each section.""",
        "rewrite": "Rewrite the following document to be clearer, more professional, and better structured.",
        "translate": f"Translate the following document to {body.target_language}. Keep the formatting.",
        "explain": "Explain this document in simple terms. Break down complex concepts.",
        "questions": "Generate 10 comprehensive questions based on this document for studying or interviews.",
        "keypoints": "Extract and list all key points, important facts, and main takeaways from this document.",
        "ats_score": """Analyze this resume/CV and provide:
1. ATS Compatibility Score (0-100)
2. Missing keywords for the industry
3. Skill gaps
4. Strengths
5. Specific improvement suggestions
6. 5 tailored interview questions""",
        "code_explain": "Explain this code in detail. Describe what it does, how it works, and any potential improvements.",
        "code_review": "Review this code for bugs, security issues, performance problems, and best practices.",
        "csv_insights": "Analyze this CSV data and provide statistical insights, trends, patterns, and key findings.",
    }

    base_prompt = action_prompts.get(body.action, "Analyze the following document:")
    if body.extra_instruction:
        base_prompt += f"\n\nAdditional instruction: {body.extra_instruction}"

    text_sample = doc.extracted_text[:15000]
    messages = [
        ChatMessage(role="user", content=f"{base_prompt}\n\n---\n\n{text_sample}")
    ]

    async def event_generator():
        import json
        full_content = []
        try:
            async for chunk in provider.chat_stream(
                messages,
                system_prompt="You are an expert document analyst. Provide thorough, structured, and actionable analysis.",
                max_tokens=3000,
            ):
                if chunk:
                    full_content.append(chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            analysis_result = "".join(full_content)
            if body.action == "summarize":
                doc.summary = analysis_result[:5000]
                db.commit()

            yield f"data: {json.dumps({'type': 'done', 'result': analysis_result})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    from fastapi.responses import StreamingResponse
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/", response_model=List[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        DocumentOut(
            id=d.id,
            filename=d.filename,
            original_filename=d.original_filename,
            file_type=d.file_type,
            file_size=d.file_size,
            summary=d.summary,
            created_at=d.created_at.isoformat(),
        )
        for d in docs
    ]


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    try:
        Path(doc.storage_path).unlink(missing_ok=True)
    except Exception:
        pass

    db.delete(doc)
    db.commit()
