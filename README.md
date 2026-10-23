# AARC (Anything Anywhere Reading Companion) 📖🤖

AARC (Anything Anywhere Reading Companion) is a modern, distraction-free reading companion with offline capabilities and AI-driven intelligence powered by Groq Llama-3. It strips away web clutter and ads, extracts readable content from articles and YouTube video transcripts, formats text into elegant editorial columns, and provides instant passage summaries, Q&A assistance, and full-text annotations.

---

## ✨ Features

- **Distraction-Free Reading Canvas**: Clean, responsive editorial reader with customizable typography (font, size, line spacing) and themes (`Dark`, `Sepia`, `Light`).
- **Web & YouTube Content Ingestion**: Ingest articles from any standard web URL or YouTube video link with automatic tracker stripping and transcript extraction.
- **AI-Powered Summaries**: Instant bullet-point executive summaries and auto-generated topical tags via Groq Llama-3.
- **Passage Tutor & Interactive Q&A**: Highlight any text passage to generate a concise summary or ask contextual questions answered directly by AARC.
- **Digital Annotation Notebook**: Highlight key passages in multiple colors and save custom notes alongside AI answers.
- **Offline PWA Support**: Built-in Service Worker caching for seamless offline reading of saved articles.
- **Secure Authentication**: JWT-based user authentication protecting your personal library and annotations.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Context**: React Context for Authentication & Theme management

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [SQLAlchemy](https://www.sqlalchemy.org/) & [Alembic](https://alembic.sqlalchemy.org/)
- **AI & LLM**: [Groq](https://groq.com/) (Llama-3 models via LangChain)
- **Scraping & Parsing**: BeautifulSoup4, Readability, YouTube Transcript API, ScraperAPI fallback

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+
- Docker & Docker Compose (for PostgreSQL)
- Groq API Key (for live AI features)

### 1. Database Setup
Start the PostgreSQL container:
```bash
docker compose up -d
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```
Swagger API documentation will be available at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License
MIT License. Built with ❤️ for avid readers and researchers.
