from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from core.deps import get_current_user
from models.schema import User, Vocabulary
from models.schemas import VocabularyCreate, VocabularyResponse

router = APIRouter(
    tags=["vocabulary"]
)


@router.post("/vocabulary", response_model=VocabularyResponse, status_code=status.HTTP_201_CREATED)
@router.post("/vocabulary/", response_model=VocabularyResponse, status_code=status.HTTP_201_CREATED)
async def create_vocabulary(
    request: VocabularyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a new vocabulary word and definition for the authenticated user.
    """
    try:
        db_vocab = Vocabulary(
            user_id=current_user.id,
            word=request.word.strip(),
            definition=request.definition.strip()
        )
        db.add(db_vocab)
        db.commit()
        db.refresh(db_vocab)
        return db_vocab
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save vocabulary: {str(e)}"
        )


@router.get("/vocabulary", response_model=List[VocabularyResponse])
@router.get("/vocabulary/", response_model=List[VocabularyResponse])
async def get_vocabulary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all vocabulary entries saved by the authenticated user.
    """
    vocab_items = (
        db.query(Vocabulary)
        .filter(Vocabulary.user_id == current_user.id)
        .order_by(Vocabulary.created_at.desc())
        .all()
    )
    return vocab_items


@router.delete("/vocabulary/{vocab_id}", status_code=status.HTTP_200_OK)
@router.delete("/vocabulary/{vocab_id}/", status_code=status.HTTP_200_OK)
async def delete_vocabulary(
    vocab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific vocabulary entry owned by the authenticated user.
    """
    try:
        vocab_item = db.query(Vocabulary).filter(Vocabulary.id == vocab_id).first()

        if not vocab_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vocabulary item with ID {vocab_id} not found."
            )

        if vocab_item.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this vocabulary item."
            )

        db.delete(vocab_item)
        db.commit()
        return {"message": "Vocabulary item successfully deleted.", "id": vocab_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete vocabulary item: {str(e)}"
        )
