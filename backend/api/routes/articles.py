from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from core.database import get_db
from models.schema import User, Article, Tag
from models.schemas import (
    ArticleIngestRequest, ArticleIngestResponse,
    ArticleListResponse, ArticleDetailResponse,
    AskRequest, AskResponse,
    SummarizePassageRequest, SummarizePassageResponse,
)
from services.extractor import extract_content
from services.ai_service import process_article_task, ask_ai, summarize_passage
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

@router.post("/ingest", response_model=ArticleIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_article(request: ArticleIngestRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Ingest a URL: check for duplicates first, then extract, save, and enqueue AI processing."""
    url_str = str(request.url)

    # Ensure system user exists
    get_or_create_system_user(db)

    # --- 1. Duplicate check: return existing article if URL already ingested ---
    existing = db.query(Article).filter(Article.original_url == url_str).first()
    if existing:
        # Return lean response with flag so frontend can show "already saved" UI
        return ArticleIngestResponse(
            id=existing.id,
            original_url=existing.original_url,
            title=existing.title,
            reading_time=existing.reading_time,
            created_at=existing.created_at,
            already_existed=True,
        )

    # --- 2. Content extraction ---
    try:
        extracted = await extract_content(url_str)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during extraction: {str(e)}"
        )

    # --- 3. Persist to database ---
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
    except IntegrityError:
        db.rollback()
        # Race condition: another request inserted the same URL between our check and commit
        existing = db.query(Article).filter(Article.original_url == url_str).first()
        if existing:
            return ArticleIngestResponse(
                id=existing.id,
                original_url=existing.original_url,
                title=existing.title,
                reading_time=existing.reading_time,
                created_at=existing.created_at,
                already_existed=True,
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save article due to a database conflict."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save article to database: {str(e)}"
        )

    # --- 4. Enqueue background AI summarization & tagging task ---
    background_tasks.add_task(process_article_task, db_article.id)

    return ArticleIngestResponse(
        id=db_article.id,
        original_url=db_article.original_url,
        title=db_article.title,
        reading_time=db_article.reading_time,
        created_at=db_article.created_at,
        already_existed=False,
    )

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


@router.post("/{article_id}/ask", response_model=AskResponse)
async def ask_article_ai(
    article_id: int,
    body: AskRequest,
    db: Session = Depends(get_db)
):
    """Ask Inkwell AI a question about an article or a specific highlighted passage."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article with ID {article_id} not found."
        )

    if not body.question or not body.question.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question cannot be empty."
        )

    try:
        answer = ask_ai(
            question=body.question,
            context=body.context,
            article_content=article.clean_content,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}"
        )

    return AskResponse(answer=answer, article_id=article_id)


@router.post("/{article_id}/summarize_passage", response_model=SummarizePassageResponse)
async def summarize_article_passage(
    article_id: int,
    body: SummarizePassageRequest,
    db: Session = Depends(get_db)
):
    """Summarize a specific highlighted text passage from an article using Groq LLM."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article with ID {article_id} not found."
        )

    if not body.context or not body.context.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Context passage cannot be empty."
        )

    try:
        summary_text = summarize_passage(context=body.context)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}"
        )

    return SummarizePassageResponse(summary=summary_text, article_id=article_id)
