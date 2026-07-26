import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.base import ChatMessage
from app.ai.factory import get_ai_provider
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])

class GenerateQuizRequest(BaseModel):
    document_id: str

class GradeQuizRequest(BaseModel):
    document_id: str
    questions: List[dict]
    user_answers: dict

def clean_json_response(content: str) -> dict:
    raw = content.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
    return json.loads(raw)

@router.post("/generate")
async def generate_quiz(
    body: GenerateQuizRequest,
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
    
    text_sample = doc.extracted_text[:15000]
    
    prompt = """Based on the following document, generate a quiz with exactly 5 multiple-choice questions and 2 short-answer questions.
    
Return the output STRICTLY as a valid JSON object matching this schema:
{
  "multiple_choice": [
    {
      "id": "mc_1",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    }
  ],
  "short_answer": [
    {
      "id": "sa_1",
      "question": "..."
    }
  ]
}

Document Text:
---
""" + text_sample

    messages = [ChatMessage(role="user", content=prompt)]
    
    try:
        response = await provider.chat(
            messages,
            system_prompt="You are an expert AI tutor. Output ONLY valid JSON, nothing else.",
            max_tokens=2000,
        )
        
        # Parse JSON cleaning any markdown code blocks
        quiz_data = clean_json_response(response.content)
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@router.post("/grade")
async def grade_quiz(
    body: GradeQuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == body.document_id,
        Document.user_id == current_user.id,
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    provider = get_ai_provider()
    text_sample = doc.extracted_text[:15000]
    
    prompt = f"""You are an expert AI grader. Grade the user's short answers based on the following source document.

Source Document:
---
{text_sample}
---

Questions and User Answers:
{json.dumps({"questions": body.questions, "user_answers": body.user_answers})}

Return the output STRICTLY as a valid JSON object matching this schema:
{{
  "score": "X/Y (e.g., 2/2)",
  "feedback": [
    {{
      "id": "sa_1",
      "is_correct": true/false,
      "explanation": "Why they are correct or wrong..."
    }}
  ],
  "overall_feedback": "Great job..."
}}
"""

    messages = [ChatMessage(role="user", content=prompt)]
    
    try:
        response = await provider.chat(
            messages,
            system_prompt="You are an expert AI grader. Output ONLY valid JSON, nothing else.",
            max_tokens=2000,
        )
        grade_data = clean_json_response(response.content)
        return grade_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade quiz: {str(e)}")
