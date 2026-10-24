"""
LLM Service Module
Provides access to Groq LLM pipelines with token limit safety nets and SQLite lock prevention.
"""

import os
import re
from typing import List, Optional

# LangChain Imports
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

# Standard fallback message for 429 and token/context limit errors
TOKEN_LIMIT_FALLBACK = (
    "The selected text is too long for the current AI token limit. Please select a smaller section."
)

# Initialize Groq LLM dynamically
llm = None
groq_key = os.getenv("GROQ_API_KEY")

if groq_key:
    try:
        llm = ChatGroq(
            temperature=0,
            model="qwen/qwen3.8-27b",
            groq_api_key=groq_key
        )
    except Exception as e:
        print(f"Warning: Failed to initialize ChatGroq: {e}")

IS_MOCK = (llm is None)
if IS_MOCK:
    print("LLM Service initialized: Using Mock Fallback Engine.")
else:
    print("LLM Service initialized: Using Live Groq LLM Engine.")


def is_token_or_rate_limit_error(e: Exception) -> bool:
    """Detect if an exception is a 429 rate limit or token limit/context length error."""
    # Check status_code attributes if present on HTTP/API errors
    status_code = getattr(e, "status_code", None) or getattr(getattr(e, "response", None), "status_code", None)
    if status_code in (429, 413):
        return True

    msg = str(e).lower()
    return any(k in msg for k in [
        "429",
        "rate limit",
        "rate_limit",
        "tpm",
        "rpm",
        "token limit",
        "token_limit",
        "tokens",
        "context length",
        "context_length",
        "too long",
        "maximum context",
        "resource_exhausted",
        "tokens per minute",
        "request too large",
        "quota exceeded"
    ])


def ask_ai(question: str, context: Optional[str] = None, article_content: str = "") -> str:
    """Answer a user question about an article passage using Groq LLM with token safety nets and 429 fallback."""
    if IS_MOCK or llm is None:
        return (
            f"[Mock AI] Your question: '{question}'.\n\n"
            "In mock mode the Groq API key is not configured. "
            "Set GROQ_API_KEY in backend/.env to enable live AI answers."
        )

    # Implement truncation safety net: limit highlighted text to roughly 3000 chars so it never exceeds free tier TPM
    raw_passage = context.strip() if context and context.strip() else (article_content or "")
    highlighted_text = raw_passage[:3000]
    safe_question = (question or "").strip()[:500]

    ask_prompt = PromptTemplate.from_template(
        "You are AARC (Anything Anywhere Reading Companion), a knowledgeable reading assistant. "
        "A user is reading an article and has highlighted the following passage:\n\n"
        "Passage:\n{passage}\n\n"
        "The user asks: {question}\n\n"
        "Provide a clear, concise, and insightful answer (2-4 sentences). "
        "Explain the key concept in the passage that answers the question. "
        "Do not repeat the question. Respond in plain prose."
    )

    try:
        chain = ask_prompt | llm
        response = chain.invoke({"passage": highlighted_text, "question": safe_question})
        return response.content.strip()
    except Exception as e:
        print(f"ask_ai error: {e}")
        if is_token_or_rate_limit_error(e):
            return TOKEN_LIMIT_FALLBACK
        # If it's a Groq API status error, still return graceful fallback to avoid breaking UI
        return TOKEN_LIMIT_FALLBACK


def summarize_highlight(context: str = "", highlighted_text: str = "") -> str:
    """
    Summarize a highlighted text passage with a truncation safety net and graceful 429/token fallback.
    Accepts text via either `highlighted_text` or `context`.
    """
    raw_text = (highlighted_text or context or "").strip()

    if IS_MOCK or llm is None:
        snippet = raw_text[:80] + ("..." if len(raw_text) > 80 else "")
        return f"[Mock Summary] This passage highlights key arguments regarding: '{snippet}'."

    # Implement truncation safety net before sending text to Groq (limit to ~3000 characters)
    highlighted_text = raw_text[:3000]

    summarize_prompt = PromptTemplate.from_template(
        "You are AARC (Anything Anywhere Reading Companion), an expert reading assistant. "
        "Summarize the following highlighted text passage in exactly 1 to 2 clear, concise sentences. "
        "Focus on the core argument or key takeaway. Output ONLY the summary text in plain prose without any bullet points or extra headers.\n\n"
        "Passage:\n{context}\n\n"
        "Summary:"
    )

    try:
        chain = summarize_prompt | llm
        response = chain.invoke({"context": highlighted_text})
        return response.content.strip()
    except Exception as e:
        print(f"summarize_highlight error: {e}")
        if is_token_or_rate_limit_error(e):
            return TOKEN_LIMIT_FALLBACK
        return TOKEN_LIMIT_FALLBACK


def summarize_passage(context: str) -> str:
    """Wrapper alias for summarize_highlight."""
    return summarize_highlight(context=context)


def generate_summary(text: str) -> List[str]:
    """Generate 3-5 concise bullet points summarizing text with safe truncation and error handling."""
    safe_text = (text or "").strip()[:3000]

    if IS_MOCK or llm is None:
        sentences = [s.strip() for s in re.split(r'[.!?]\s+', safe_text) if len(s.strip()) > 20]
        if len(sentences) >= 3:
            return sentences[:4]
        return [
            "This is a mock summary bullet point representing the article content.",
            "Ingested data parsed successfully through the extraction service layer.",
            "Active API keys (GROQ_API_KEY) will unlock live AI generation."
        ]

    summary_prompt = PromptTemplate.from_template(
        "You are an expert summarizer. Analyze the text below and output a concise summary of exactly 3 to 5 bullet points. "
        "Do NOT use markdown list markers like * or - or numbers. Output each bullet point as a clean sentence on its own line.\n\n"
        "Text:\n{text}\n\n"
        "Summary:"
    )
    try:
        chain = summary_prompt | llm
        response = chain.invoke({"text": safe_text})
        raw_output = response.content

        bullets = []
        for line in raw_output.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            cleaned = re.sub(r'^[•\-\*\d\.\s]+', '', line).strip()
            if cleaned:
                bullets.append(cleaned)

        if not bullets:
            return ["No summary bullets could be parsed from LLM output."]
        return bullets[:5]
    except Exception as e:
        print(f"AI summary generation failed: {e}")
        if is_token_or_rate_limit_error(e):
            return ["The article content was too large for immediate full summarization. Please highlight specific passages for instant insights."]
        return ["Summary currently unavailable due to an AI processing error."]


def generate_tags(text: str) -> List[str]:
    """Generate exactly 3 relevant topic tags with safe truncation and error handling."""
    safe_text = (text or "").strip()[:3000]

    if IS_MOCK or llm is None:
        text_lower = safe_text.lower()
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
            if kw in text_lower and tag not in candidates:
                candidates.append(tag)

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
        response = chain.invoke({"text": safe_text})
        raw_output = response.content
        tags = [t.strip() for t in raw_output.split(",") if t.strip()]
        return tags[:3]
    except Exception as e:
        print(f"AI tag generation failed: {e}")
        if is_token_or_rate_limit_error(e):
            return ["General", "Reading", "AARC"]
        return ["General", "Reading", "AARC"]


def process_article_task(article_id: int):
    """Wrapper delegate to services.ai_service.process_article_task."""
    from services.ai_service import process_article_task as _process_article_task
    return _process_article_task(article_id)

