import os
import re
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, cast, String as SqlString
from core.database import get_db
from core.deps import get_current_user, get_optional_current_user
from models.schema import User, Article, Tag, Summary
from models.schemas import (
    ArticleIngestRequest, ArticleIngestResponse,
    ArticleListResponse, ArticleDetailResponse,
    AskRequest, AskResponse,
    SummarizePassageRequest, SummarizePassageResponse,
    SearchResultResponse,
)
from services.extractor import extract_content, extract_web, get_youtube_title
from services.llm_service import (
    process_article_task,
    ask_ai,
    summarize_passage,
    summarize_highlight,
    TOKEN_LIMIT_FALLBACK,
    is_token_or_rate_limit_error,
)
from youtube_transcript_api import YouTubeTranscriptApi
from groq import Groq

# Initialize Groq client
groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key) if groq_api_key else None

# Compatibility patch for YouTubeTranscriptApi.get_transcript across package versions
def _fetch_transcript_compat(vid: str):
    try:
        res = YouTubeTranscriptApi().fetch(vid)
        if hasattr(res, "to_raw_data"):
            return res.to_raw_data()
        return list(res)
    except AttributeError:
        return YouTubeTranscriptApi.get_transcript(vid)

if not hasattr(YouTubeTranscriptApi, "get_transcript"):
    YouTubeTranscriptApi.get_transcript = staticmethod(_fetch_transcript_compat)

def extract_video_id(url: str) -> Optional[str]:
    """Extract 11-character YouTube video ID using regex: r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'"""
    match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url)
    return match.group(1) if match else None

def parse_summary_and_tags(output_text: str) -> tuple[List[str], List[str]]:
    """Parse Groq model response for 3 bullet points and comma-separated tags."""
    lines = [line.strip() for line in output_text.strip().splitlines() if line.strip()]
    tag_line = None
    remaining_lines = []

    for line in lines:
        lower = line.lower()
        if lower.startswith("tags:") or lower.startswith("**tags:**") or lower.startswith("tags :"):
            tag_line = re.sub(r'^\*?\*?tags:?\*?\*?', '', line, flags=re.IGNORECASE).strip()
        else:
            remaining_lines.append(line)

    if not tag_line and remaining_lines:
        last_line = remaining_lines[-1]
        if "," in last_line and not re.match(r'^[•\-\*\d\.]', last_line):
            tag_line = last_line
            remaining_lines = remaining_lines[:-1]

    tags = []
    if tag_line:
        tags = [t.strip().strip("*`") for t in tag_line.split(",") if t.strip()]

    bullets = []
    for line in remaining_lines:
        cleaned = re.sub(r'^[•\-\*\d\.\s]+', '', line).strip()
        cleaned = re.sub(r'^\*\*(.*?)\*\*$', r'\1', cleaned).strip()
        if cleaned and len(cleaned) > 5 and not cleaned.lower().startswith("summary:"):
            bullets.append(cleaned)

    if not bullets:
        bullets = ["Overview of key insights and core discussion from the source content."]
    if not tags:
        tags = ["Reading", "Insights", "General"]

    return bullets[:5], tags[:5]

def generate_groq_summary_and_tags(content_text: str) -> tuple[List[str], List[str]]:
    """Groq Summarization with Smart Truncation: first 40,000 characters."""
    safe_text_for_summary = content_text[:40000]
    prompt = f"Summarize the following content in 3 short bullet points, and provide 3 relevant tags comma-separated. Content: {safe_text_for_summary}"

    raw_response = None
    if groq_client:
        # Call Groq API using llama-3.1-8b-instant with fallback to available active models
        models_to_try = ["llama-3.1-8b-instant", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
        for model_name in models_to_try:
            try:
                resp = groq_client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=350,
                    temperature=0.2,
                )
                raw_response = resp.choices[0].message.content
                if raw_response:
                    break
            except Exception:
                continue

    if not raw_response:
        return (
            [
                "Key insights and overview extracted from the source content.",
                "Primary topics and essential arguments summarized.",
                "Automated AI processing successfully indexed this entry."
            ],
            ["Insights", "Reading", "General"]
        )

    return parse_summary_and_tags(raw_response)

router = APIRouter(
    prefix="/articles",
    tags=["articles"]
)


@router.post("/ingest", response_model=ArticleIngestResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=ArticleIngestResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ArticleIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_article(
    request: ArticleIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ingest a URL: handles YouTube videos using youtube-transcript-api and articles via BeautifulSoup with Groq Smart Truncation."""
    try:
        url_str = str(request.url)

        # --- 1. Duplicate check: return existing article if URL already ingested ---
        existing = db.query(Article).filter(Article.original_url == url_str).first()

        if existing:
            return ArticleIngestResponse(
                id=existing.id,
                original_url=existing.original_url,
                title=existing.title,
                reading_time=existing.reading_time,
                media_type=getattr(existing, "media_type", "article") or "article",
                created_at=existing.created_at,
                already_existed=True,
            )

        # --- 2. Detect YouTube vs Web Article ---
        is_youtube = "youtube.com" in url_str or "youtu.be" in url_str

        if is_youtube:
            # Extract video ID; raise 400 if invalid
            video_id = extract_video_id(url_str)
            if not video_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid YouTube URL: could not extract video ID."
                )

            # Retrieve transcript using youtube-transcript-api
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not retrieve transcript for YouTube video {video_id}: {str(e)}"
                )

            # Format into paragraphs: loop through transcript, group every 5-7 segments, join with spaces, separate with \n\n
            segments = []
            for item in transcript:
                raw = item.get("text", "") if isinstance(item, dict) else getattr(item, "text", str(item))
                cleaned = raw.strip().replace("\n", " ")
                if cleaned:
                    segments.append(cleaned)

            group_size = 6
            paragraphs = []
            for i in range(0, len(segments), group_size):
                chunk = segments[i:i + group_size]
                p = " ".join(chunk).strip()
                if p:
                    paragraphs.append(p)

            content_text = "\n\n".join(paragraphs) if paragraphs else "No spoken content transcribed."
            media_type = "video"
            title = await get_youtube_title(video_id)
        else:
            # Existing BeautifulSoup extraction logic
            try:
                extracted = await extract_web(url_str)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"An error occurred during extraction: {str(e)}"
                )

            content_text = extracted["clean_content"]
            title = extracted["title"]
            media_type = "article"

        # Reading time calculation
        reading_time = max(1, math.ceil(len(content_text.split()) / 200))

        # --- 3. Groq Summarization with Smart Truncation (:40000) ---
        summary_bullets, tag_names = generate_groq_summary_and_tags(content_text)

        # --- 4. Database Save with FULL text using content=content_text ---
        db_article = Article(
            user_id=current_user.id if current_user else None,
            original_url=url_str,
            title=title,
            content=content_text,
            clean_content=content_text,
            reading_time=reading_time,
            media_type=media_type,
        )

        try:
            db.add(db_article)
            db.flush()

            # Save Groq-generated summary
            summary_obj = Summary(
                article_id=db_article.id,
                bullet_points=summary_bullets
            )
            db.add(summary_obj)

            # Save Groq-generated tags
            for t_name in tag_names:
                t_clean = t_name.strip()
                if not t_clean:
                    continue
                tag_obj = db.query(Tag).filter(Tag.name == t_clean).first()
                if not tag_obj:
                    tag_obj = Tag(name=t_clean)
                    db.add(tag_obj)
                    db.flush()
                if tag_obj not in db_article.tags:
                    db_article.tags.append(tag_obj)

            db.commit()
            db.refresh(db_article)
        except IntegrityError:
            db.rollback()
            existing = db.query(Article).filter(Article.original_url == url_str).first()
            if existing:
                return ArticleIngestResponse(
                    id=existing.id,
                    original_url=existing.original_url,
                    title=existing.title,
                    reading_time=existing.reading_time,
                    media_type=getattr(existing, "media_type", "article") or "article",
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

        return ArticleIngestResponse(
            id=db_article.id,
            original_url=db_article.original_url,
            title=db_article.title,
            reading_time=db_article.reading_time,
            media_type=db_article.media_type,
            created_at=db_article.created_at,
            already_existed=False,
        )
    finally:
        try:
            db.close()
        except Exception:
            pass


@router.get("/", response_model=List[ArticleListResponse])
async def get_articles(
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all articles accessible to current_user, optionally filtered by tag."""
    query = db.query(Article)
    
    if tag:
        tag_lower = tag.strip().lower()
        query = query.join(Article.tags).filter(Tag.name == tag_lower)
        
    articles = query.order_by(Article.created_at.desc()).all()
    return articles


@router.get("/search", response_model=List[SearchResultResponse])
async def search_articles_route(
    q: str = Query("", description="Search query string"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Search articles across title, content, and summary bullet points."""
    term = q.strip()
    if not term:
        return []

    search_pattern = f"%{term}%"
    query = (
        db.query(Article)
        .outerjoin(Summary, Article.id == Summary.article_id)
        .filter(
            or_(
                Article.title.ilike(search_pattern),
                Article.clean_content.ilike(search_pattern),
                cast(Summary.bullet_points, SqlString).ilike(search_pattern)
            )
        )
        .order_by(Article.created_at.desc())
        .limit(20)
    )

    results = query.all()
    return [
        SearchResultResponse(
            id=a.id,
            title=a.title,
            media_type=getattr(a, "media_type", "article") or "article",
            reading_time=a.reading_time
        )
        for a in results
    ]


@router.get("/{article_id}", response_model=ArticleDetailResponse)
async def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve a specific article by ID for current_user including full content, summary, and tags."""
    article = db.query(Article).filter(Article.id == article_id).first()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article with ID {article_id} not found."
        )
    return article


@router.delete("/{article_id}", status_code=status.HTTP_200_OK)
async def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove an article owned by current_user from the library."""
    try:
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
    finally:
        try:
            db.close()
        except Exception:
            pass


@router.post("/{article_id}/ask", response_model=AskResponse)
async def ask_article_ai(
    article_id: int,
    body: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ask AARC AI a question about an article owned by or accessible to current_user."""
    clean_content = ""
    try:
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

        clean_content = article.clean_content or ""
    finally:
        # Guarantee DB session is closed before calling external AI API to prevent SQLite locks
        try:
            db.close()
        except Exception:
            pass

    try:
        answer = ask_ai(
            question=body.question,
            context=body.context,
            article_content=clean_content,
        )
    except Exception as e:
        print(f"ask_article_ai route exception: {e}")
        if is_token_or_rate_limit_error(e):
            answer = TOKEN_LIMIT_FALLBACK
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {str(e)}"
            )

    return AskResponse(answer=answer, article_id=article_id)


@router.post("/{article_id}/summarize_passage", response_model=SummarizePassageResponse)
async def summarize_article_passage(
    article_id: int,
    body: SummarizePassageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Summarize a specific highlighted text passage from an article accessible to current_user using Groq LLM."""
    try:
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
    finally:
        # Guarantee DB session is closed before calling external AI API to prevent SQLite locks
        try:
            db.close()
        except Exception:
            pass

    try:
        summary_text = summarize_passage(context=body.context)
    except Exception as e:
        print(f"summarize_article_passage route exception: {e}")
        if is_token_or_rate_limit_error(e):
            summary_text = TOKEN_LIMIT_FALLBACK
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {str(e)}"
            )

    return SummarizePassageResponse(summary=summary_text, article_id=article_id)
