from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from models.schema import Article, Highlight
from models.schemas import HighlightCreate, HighlightResponse
from typing import List

router = APIRouter(
    tags=["highlights"]
)

@router.post("/articles/{article_id}/highlights", response_model=HighlightResponse, status_code=status.HTTP_201_CREATED)
async def create_highlight(article_id: int, request: HighlightCreate, db: Session = Depends(get_db)):
    """Create a text highlight and optional note linked to an article."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article with ID {article_id} not found."
        )

    db_highlight = Highlight(
        article_id=article_id,
        selected_text=request.selected_text,
        note=request.note,
        position_start=request.position_start,
        position_end=request.position_end,
        color=request.color or "yellow"
    )

    try:
        db.add(db_highlight)
        db.commit()
        db.refresh(db_highlight)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save highlight: {str(e)}"
        )

    return db_highlight

@router.get("/articles/{article_id}/highlights", response_model=List[HighlightResponse])
async def get_highlights(article_id: int, db: Session = Depends(get_db)):
    """Fetch all highlights and notes for a specific article."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article with ID {article_id} not found."
        )

    highlights = db.query(Highlight).filter(Highlight.article_id == article_id).all()
    return highlights

@router.delete("/highlights/{highlight_id}", status_code=status.HTTP_200_OK)
async def delete_highlight(highlight_id: int, db: Session = Depends(get_db)):
    """Delete a highlight by ID."""
    highlight = db.query(Highlight).filter(Highlight.id == highlight_id).first()
    if not highlight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Highlight with ID {highlight_id} not found."
        )

    try:
        db.delete(highlight)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete highlight: {str(e)}"
        )

    return {"message": "Highlight successfully deleted."}
