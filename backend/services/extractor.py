import re
import math
import httpx
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi

def get_youtube_video_id(url: str) -> str | None:
    """Extract 11-character YouTube video ID from a URL."""
    reg = r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})'
    match = re.search(reg, url)
    return match.group(1) if match else None

def is_youtube_url(url: str) -> bool:
    """Check if URL points to YouTube."""
    return get_youtube_video_id(url) is not None

async def get_youtube_title(video_id: str) -> str:
    """Fetch video title using YouTube's oEmbed API."""
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(oembed_url, timeout=5.0)
            if res.status_code == 200:
                return res.json().get("title", f"YouTube Video {video_id}")
    except Exception:
        pass
    return f"YouTube Video {video_id}"

def clean_youtube_transcript(transcript_list) -> str:
    """Combine transcript entries into paragraphs."""
    text_items = []
    for entry in transcript_list:
        if isinstance(entry, dict):
            text_items.append(entry.get("text", ""))
        else:
            text_items.append(getattr(entry, "text", ""))
            
    # Simple formatting: group entries into chunks of 30 items as 'paragraphs'
    paragraphs = []
    chunk_size = 30
    for i in range(0, len(text_items), chunk_size):
        paragraph = " ".join(text_items[i:i + chunk_size])
        paragraphs.append(paragraph)
    return "\n\n".join(paragraphs)

async def extract_youtube(url: str) -> dict:
    """Fetch transcript and title for a YouTube video."""
    video_id = get_youtube_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")

    # Fetch transcript
    try:
        transcript_list = YouTubeTranscriptApi().fetch(video_id)
        clean_content = clean_youtube_transcript(transcript_list)
    except Exception as e:
        raise ValueError(f"Could not retrieve transcript for YouTube video {video_id}: {str(e)}")

    # Fetch title
    title = await get_youtube_title(video_id)

    return {
        "title": title,
        "clean_content": clean_content
    }

async def extract_web(url: str) -> dict:
    """Fetch and parse content of a standard web page."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        try:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            html = response.text
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                raise ValueError(f"Access forbidden (403 Error) when fetching {url}. The site blocks web scrapers.")
            raise ValueError(f"Failed to fetch webpage ({e.response.status_code}): {str(e)}")
        except Exception as e:
            raise ValueError(f"Failed to fetch webpage: {str(e)}")

    title = ""
    clean_content = ""

    # Try newspaper3k first if available
    try:
        from newspaper import Article as NewspaperArticle
        article = NewspaperArticle(url)
        article.set_html(html)
        article.parse()
        title = article.title
        clean_content = article.text
    except Exception:
        pass

    # Fallback to BeautifulSoup if newspaper3k parsing failed or wasn't available
    if not title or not clean_content:
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract title
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        else:
            h1 = soup.find("h1")
            title = h1.get_text().strip() if h1 else "Untitled Article"

        # Remove clutter
        for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
            element.extract()

        # Simple text clean up
        lines = (line.strip() for line in soup.get_text().splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_content = "\n".join(chunk for chunk in chunks if chunk)

    return {
        "title": title or "Untitled Article",
        "clean_content": clean_content or "No content could be extracted."
    }

def calculate_reading_time(text: str) -> int:
    """Calculate reading time in minutes (based on 200 WPM)."""
    words = text.split()
    word_count = len(words)
    return max(1, math.ceil(word_count / 200))

async def extract_content(url: str) -> dict:
    """Extract content from either YouTube or web URL, and compute reading time."""
    if is_youtube_url(url):
        data = await extract_youtube(url)
    else:
        data = await extract_web(url)

    data["reading_time"] = calculate_reading_time(data["clean_content"])
    return data
