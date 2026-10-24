"""
AI Service Module
Orchestrates AI tasks (summarization, tagging, Q&A) and background task processing.
Uses strict try...except...finally blocks with explicit db.close() to prevent SQLite database locks.
"""

from typing import List, Optional
from core.database import SessionLocal
from models.schema import Article, Summary, Tag

# Import core LLM capabilities from llm_service
from services.llm_service import (
    ask_ai,
    summarize_highlight,
    summarize_passage,
    generate_summary,
    generate_tags,
    TOKEN_LIMIT_FALLBACK,
    is_token_or_rate_limit_error,
    llm,
    IS_MOCK
)

__all__ = [
    "ask_ai",
    "summarize_highlight",
    "summarize_passage",
    "generate_summary",
    "generate_tags",
    "process_article_task",
    "TOKEN_LIMIT_FALLBACK",
    "is_token_or_rate_limit_error",
    "llm",
    "IS_MOCK"
]


def process_article_task(article_id: int):
    """
    Background task: Orchestrate summarization and tagging for an ingested article.
    
    Database Lock Prevention:
    - Step 1: Open session to fetch article content, then close it immediately in finally.
    - Step 2: Run AI generation outside of any active database connection/lock.
    - Step 3: Open session in a strict try...except...finally block to commit results,
      explicitly calling db.close() in finally.
    """
    clean_content = ""
    fetch_db = SessionLocal()
    try:
        article = fetch_db.query(Article).filter(Article.id == article_id).first()
        if not article:
            print(f"Error: Article {article_id} not found in background task.")
            return
        clean_content = article.clean_content or ""
    except Exception as e:
        print(f"Error fetching article {article_id} in background task: {e}")
        return
    finally:
        try:
            fetch_db.close()
        except Exception as close_err:
            print(f"Error closing DB fetch session in background task: {close_err}")

    # Step 2: Execute AI calls WITHOUT holding any SQLite transaction or lock
    try:
        summary_bullets = generate_summary(clean_content)
    except Exception as e:
        print(f"Error generating summary for article {article_id}: {e}")
        if is_token_or_rate_limit_error(e):
            summary_bullets = [TOKEN_LIMIT_FALLBACK]
        else:
            summary_bullets = ["Error generating AI summary."]

    try:
        tag_names = generate_tags(clean_content)
    except Exception as e:
        print(f"Error generating tags for article {article_id}: {e}")
        tag_names = ["General", "AARC"]

    # Step 3: Persist results in a strict try...except...finally block that explicitly calls db.close()
    save_db = SessionLocal()
    try:
        article = save_db.query(Article).filter(Article.id == article_id).first()
        if not article:
            print(f"Error: Article {article_id} no longer exists when saving background task results.")
            return

        # Insert or update Summary
        existing_summary = save_db.query(Summary).filter(Summary.article_id == article.id).first()
        if existing_summary:
            existing_summary.bullet_points = summary_bullets
        else:
            summary_obj = Summary(
                article_id=article.id,
                bullet_points=summary_bullets
            )
            save_db.add(summary_obj)

        # Insert/Map Tags
        for tag_name in tag_names:
            tag_name_clean = tag_name.strip().lower()
            if not tag_name_clean:
                continue

            tag = save_db.query(Tag).filter(Tag.name == tag_name_clean).first()
            if not tag:
                tag = Tag(name=tag_name_clean)
                save_db.add(tag)
                save_db.flush()

            if tag not in article.tags:
                article.tags.append(tag)

        save_db.commit()
        print(f"Background task: Successfully processed AI Summary and Tags for Article {article_id}.")
    except Exception as e:
        try:
            save_db.rollback()
        except Exception as rb_err:
            print(f"Error rolling back DB in background task: {rb_err}")
        print(f"Background task: Failed to process Article {article_id}: {e}")
    finally:
        try:
            save_db.close()
        except Exception as close_err:
            print(f"Error explicitly closing DB session in background task: {close_err}")
