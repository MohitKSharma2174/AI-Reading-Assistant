from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from core.database import get_db
from models.schema import User, Article, Tag
from models.schemas import ArticleIngestRequest, ArticleResponse, ArticleListResponse, ArticleDetailResponse
from services.extractor import extract_content
from services.ai_service import process_article_task
from typing import List, Optional

router = APIRouter(
    prefix="/articles",
    tags=["articles"]
)

def get_or_create_system_user(db: Session) -> User:
    """Ensure a default system user exists for mapping ingested articles."""
    system_user = db.query(User).filter(User.id == 1).first()
    if not system_user:
        system_user = User(
            id=1,
            email="system@aireader.local",
            password_hash="system_default_hash",
            preferences={}
        )
        db.add(system_user)
        try:
            db.commit()
            db.refresh(system_user)
        except Exception:
            db.rollback()
            # If already created in a concurrent request, fetch again
            system_user = db.query(User).filter(User.id == 1).first()
    return system_user

@router.post("/ingest", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
async def ingest_article(request: ArticleIngestRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Ingest a URL, extract title and text contents, save to the database, and return results."""
    # Ensure system user exists
    get_or_create_system_user(db)
    
    # Process extraction
    try:
        url_str = str(request.url)
        extracted = await extract_content(url_str)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during extraction: {str(e)}"
        )

    # Save to database
    db_article = Article(
        user_id=1,
        original_url=url_str,
        title=extracted["title"],
        clean_content=extracted["clean_content"],
        reading_time=extracted["reading_time"]
    )
    
    try:
        db.add(db_article)
        db.commit()
        db.refresh(db_article)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save article to database: {str(e)}"
        )

    # Enqueue background AI summarization & tagging task
    background_tasks.add_task(process_article_task, db_article.id)

    return db_article

@router.get("/", response_model=List[ArticleListResponse])
async def get_articles(tag: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve all articles for system user (ID: 1), optionally filtered by tag, ordered by created_at desc."""
    query = db.query(Article).filter(Article.user_id == 1)
    
    if tag:
        tag_lower = tag.strip().lower()
        query = query.join(Article.tags).filter(Tag.name == tag_lower)
        
    articles = query.order_by(Article.created_at.desc()).all()
    return articles

@router.get("/{article_id}", response_model=ArticleDetailResponse)
async def get_article(article_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific article by ID including full content, summary, and tags."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article with ID {article_id} not found."
        )
    return article

@router.delete("/{article_id}", status_code=status.HTTP_200_OK)
async def delete_article(article_id: int, db: Session = Depends(get_db)):
    """Remove an article from the library."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article with ID {article_id} not found."
        )
    
    try:
        db.delete(article)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete article: {str(e)}"
        )
    return {"message": "Article successfully deleted."}
