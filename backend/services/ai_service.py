import os
import re
from typing import List
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.schema import Article, Summary, Tag

# LangChain Imports
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

# Initialize LLM dynamically
llm = None
groq_key = os.getenv("GROQ_API_KEY")

if groq_key:
    try:
        llm = ChatGroq(
            temperature=0,
            model="llama-3.1-8b-instant",
            groq_api_key=groq_key
        )
    except Exception as e:
        print(f"Warning: Failed to initialize ChatGroq: {e}")

IS_MOCK = (llm is None)
if IS_MOCK:
    print("AI Service initialized: Using Mock Fallback Engine.")
else:
    print("AI Service initialized: Using Live LLM Engine.")

def generate_summary(text: str) -> List[str]:
    """Generate 3-5 concise bullet points summarizing the text."""
    if IS_MOCK:
        # Extractive mock summarizer: first 4 sentences of length > 20 characters
        sentences = [s.strip() for s in re.split(r'[.!?]\s+', text) if len(s.strip()) > 20]
        if len(sentences) >= 3:
            return sentences[:4]
        return [
            "This is a mock summary bullet point representing the article content.",
            "Ingested data parsed successfully through the extraction service layer.",
            "Active API keys (GOOGLE_API_KEY/OPENAI_API_KEY) will unlock live AI generation."
        ]

    summary_prompt = PromptTemplate.from_template(
        "You are an expert summarizer. Analyze the text below and output a concise summary of exactly 3 to 5 bullet points. "
        "Do NOT use markdown list markers like * or - or numbers. Output each bullet point as a clean sentence on its own line.\n\n"
        "Text:\n{text}\n\n"
        "Summary:"
    )
    try:
        chain = summary_prompt | llm
        response = chain.invoke({"text": text})
        raw_output = response.content
        
        # Parse output line-by-line
        bullets = []
        for line in raw_output.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            # Strip bullet prefixes (*, -, •, numbers)
            cleaned = re.sub(r'^[•\-\*\d\.\s]+', '', line).strip()
            if cleaned:
                bullets.append(cleaned)
        
        if not bullets:
            return ["No summary bullets could be parsed from LLM output."]
        return bullets[:5]
    except Exception as e:
        print(f"AI summary generation failed: {e}")
        raise e

def generate_tags(text: str) -> List[str]:
    """Generate exactly 3 relevant topic tags."""
    if IS_MOCK:
        text_lower = text.lower()
        candidates = []
        keywords = {
            "artificial intelligence": "AI",
            "machine learning": "Machine Learning",
            "programming": "Programming",
            "software": "Software",
            "google": "Tech",
            "apple": "Tech",
            "microsoft": "Tech",
            "science": "Science",
            "space": "Space",
            "music": "Music",
            "rock": "Music",
            "song": "Music",
            "lyrics": "Music",
            "finance": "Finance",
            "business": "Business",
            "economy": "Economy"
        }
        for kw, tag in keywords.items():
            if kw in text_lower:
                if tag not in candidates:
                    candidates.append(tag)
        
        # Backfill if we don't have 3 tags
        for default in ["Technology", "Information", "General"]:
            if len(candidates) >= 3:
                break
            if default not in candidates:
                candidates.append(default)
        return candidates[:3]

    tag_prompt = PromptTemplate.from_template(
        "You are an expert classifier. Analyze the text below and return exactly 3 relevant topic tags. "
        "Output ONLY the 3 tags separated by commas, on a single line. Do not include markdown or numbers.\n\n"
        "Text:\n{text}\n\n"
        "Tags:"
    )
    try:
        chain = tag_prompt | llm
        response = chain.invoke({"text": text})
        raw_output = response.content
        tags = [t.strip() for t in raw_output.split(",") if t.strip()]
        return tags[:3]
    except Exception as e:
        print(f"AI tag generation failed: {e}")
        raise e

def process_article_task(article_id: int):
    """Orchestrate summarization and tagging, and save database records."""
    db = SessionLocal()
    try:
        # Fetch target article
        article = db.query(Article).filter(Article.id == article_id).first()
        if not article:
            print(f"Error: Article {article_id} not found in background task.")
            return

        # Execute extraction
        try:
            summary_bullets = generate_summary(article.clean_content)
        except Exception as e:
            print(f"Error generating summary for article {article_id}: {e}")
            summary_bullets = ["Error generating AI summary."]

        try:
            tag_names = generate_tags(article.clean_content)
        except Exception as e:
            print(f"Error generating tags for article {article_id}: {e}")
            tag_names = ["General", "AI Reader"]

        # Insert Summary
        summary_obj = Summary(
            article_id=article.id,
            bullet_points=summary_bullets
        )
        db.add(summary_obj)

        # Insert/Map Tags
        for tag_name in tag_names:
            tag_name_clean = tag_name.strip().lower()
            if not tag_name_clean:
                continue
            
            # Find existing or create tag
            tag = db.query(Tag).filter(Tag.name == tag_name_clean).first()
            if not tag:
                tag = Tag(name=tag_name_clean)
                db.add(tag)
                db.flush()  # Generate tag.id

            if tag not in article.tags:
                article.tags.append(tag)

        db.commit()
        print(f"Background task: Successfully processed AI Summary and Tags for Article {article_id}.")
    except Exception as e:
        db.rollback()
        print(f"Background task: Failed to process Article {article_id}: {e}")
    finally:
        # ALWAYS close the session - prevents pool exhaustion if Groq API hangs
        db.close()


def ask_ai(question: str, context: str | None, article_content: str) -> str:
    """Answer a user question about an article passage using Groq LLM."""
    if IS_MOCK:
        return (
            f"[Mock AI] Your question: '{question}'.\n\n"
            "In mock mode the Groq API key is not configured. "
            "Set GROQ_API_KEY in backend/.env to enable live AI answers."
        )

    # Build a focused prompt: use highlighted context when available, else article snippet
    passage = context.strip() if context and context.strip() else article_content[:2000]

    ask_prompt = PromptTemplate.from_template(
        "You are Inkwell, a knowledgeable reading assistant. "
        "A user is reading an article and has highlighted the following passage:\n\n"
        "Passage:\n{passage}\n\n"
        "The user asks: {question}\n\n"
        "Provide a clear, concise, and insightful answer (2-4 sentences). "
        "Explain the key concept in the passage that answers the question. "
        "Do not repeat the question. Respond in plain prose."
    )

    try:
        chain = ask_prompt | llm
        response = chain.invoke({"passage": passage, "question": question})
        return response.content.strip()
    except Exception as e:
        print(f"ask_ai failed: {e}")
        raise e


def summarize_passage(context: str) -> str:
    """Generate a 1-2 sentence concise summary of a specific highlighted passage."""
    if IS_MOCK:
        cleaned = context.strip()
        snippet = cleaned[:80] + ("..." if len(cleaned) > 80 else "")
        return f"[Mock Summary] This passage highlights key arguments regarding: '{snippet}'."

    summarize_prompt = PromptTemplate.from_template(
        "You are Inkwell, an expert reading assistant. "
        "Summarize the following highlighted text passage in exactly 1 to 2 clear, concise sentences. "
        "Focus on the core argument or key takeaway. Output ONLY the summary text in plain prose without any bullet points or extra headers.\n\n"
        "Passage:\n{context}\n\n"
        "Summary:"
    )

    try:
        chain = summarize_prompt | llm
        response = chain.invoke({"context": context.strip()})
        return response.content.strip()
    except Exception as e:
        print(f"summarize_passage failed: {e}")
        raise e

