"""
routers/prompts.py
------------------
Prompt library CRUD endpoints.
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.prompt import SavedPrompt
from app.models.user import User

router = APIRouter(prefix="/api/prompts", tags=["Prompt Library"])


class PromptCreate(BaseModel):
    title: str
    content: str
    category: str = "General"
    tags: str = ""
    is_favorite: bool = False


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    is_favorite: Optional[bool] = None


class PromptOut(BaseModel):
    id: str
    title: str
    content: str
    category: str
    tags: str
    is_favorite: bool
    use_count: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[PromptOut])
def list_prompts(
    category: Optional[str] = None,
    favorites_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SavedPrompt).filter(SavedPrompt.user_id == current_user.id)
    if category:
        query = query.filter(SavedPrompt.category == category)
    if favorites_only:
        query = query.filter(SavedPrompt.is_favorite == True)  # noqa: E712
    if search:
        query = query.filter(
            SavedPrompt.title.ilike(f"%{search}%") | SavedPrompt.content.ilike(f"%{search}%")
        )
    prompts = query.order_by(SavedPrompt.is_favorite.desc(), SavedPrompt.use_count.desc()).all()
    return [
        PromptOut(
            id=p.id, title=p.title, content=p.content,
            category=p.category, tags=p.tags,
            is_favorite=p.is_favorite, use_count=p.use_count,
            created_at=p.created_at.isoformat(),
            updated_at=p.updated_at.isoformat(),
        )
        for p in prompts
    ]


@router.post("/", response_model=PromptOut, status_code=201)
def create_prompt(
    body: PromptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = SavedPrompt(
        user_id=current_user.id,
        **body.model_dump(),
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return PromptOut(
        id=prompt.id, title=prompt.title, content=prompt.content,
        category=prompt.category, tags=prompt.tags,
        is_favorite=prompt.is_favorite, use_count=prompt.use_count,
        created_at=prompt.created_at.isoformat(),
        updated_at=prompt.updated_at.isoformat(),
    )


@router.put("/{prompt_id}", response_model=PromptOut)
def update_prompt(
    prompt_id: str,
    body: PromptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = db.query(SavedPrompt).filter(
        SavedPrompt.id == prompt_id, SavedPrompt.user_id == current_user.id
    ).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(prompt, field, value)

    db.commit()
    db.refresh(prompt)
    return PromptOut(
        id=prompt.id, title=prompt.title, content=prompt.content,
        category=prompt.category, tags=prompt.tags,
        is_favorite=prompt.is_favorite, use_count=prompt.use_count,
        created_at=prompt.created_at.isoformat(),
        updated_at=prompt.updated_at.isoformat(),
    )


@router.delete("/{prompt_id}", status_code=204)
def delete_prompt(
    prompt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = db.query(SavedPrompt).filter(
        SavedPrompt.id == prompt_id, SavedPrompt.user_id == current_user.id
    ).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()


@router.post("/{prompt_id}/use")
def increment_use_count(
    prompt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = db.query(SavedPrompt).filter(
        SavedPrompt.id == prompt_id, SavedPrompt.user_id == current_user.id
    ).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt.use_count += 1
    db.commit()
    return {"use_count": prompt.use_count}


@router.get("/export")
def export_prompts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompts = db.query(SavedPrompt).filter(SavedPrompt.user_id == current_user.id).all()
    data = [
        {
            "title": p.title,
            "content": p.content,
            "category": p.category,
            "tags": p.tags,
            "is_favorite": p.is_favorite,
        }
        for p in prompts
    ]
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=prompts.json"},
    )


@router.post("/import")
def import_prompts(
    body: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    imported = 0
    for item in body:
        if not item.get("title") or not item.get("content"):
            continue
        prompt = SavedPrompt(
            user_id=current_user.id,
            title=item.get("title"),
            content=item.get("content"),
            category=item.get("category", "General"),
            tags=item.get("tags", ""),
            is_favorite=item.get("is_favorite", False),
        )
        db.add(prompt)
        imported += 1
    db.commit()
    return {"imported": imported}
