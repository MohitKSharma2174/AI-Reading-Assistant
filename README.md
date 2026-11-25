<div align="center">

# AARC — Anything Anywhere Reading Companion

Distraction-free editorial reading for web articles and YouTube transcripts, paired with AI-assisted summaries, inline jargon explanations, and native audio playback.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-LLM_Pipeline-F55036?style=flat-square)](https://groq.com/)

[Live App](https://ai-reading-assistant-rust.vercel.app) · [Backend API Docs](https://ai-reading-assistant-tbt9.onrender.com/docs)

<!-- Add screenshot: docs/assets/aarc-preview.png -->

</div>

---

## Core Capabilities

- **Dual-Engine Ingestion:** Extracts clean prose from web articles (`BeautifulSoup` with optional `ScraperAPI` proxy support) and spoken transcripts from YouTube videos (`youtube-transcript-api` with oEmbed title lookup and 6-segment paragraph grouping). Automatically computes reading time, applies 40,000-character truncation prior to Groq summarization, and normalizes topic tags to lowercase.
- **Editorial Reading Canvas:** Pairs sans-serif and editorial serif typefaces (`Geist` / serif reader mode) across Light, Sepia, and Dark themes. Supports incremental font sizing, adjustable line spacing and character tracking, and collapsible Focus Mode sidebars in `/article/[id]`.
- **Active Comprehension Tools:**
  - **Magic Tooltip:** Highlight any term or short sentence (up to 200 characters) for an inline definition or plain-English ELI5 explanation, with one-click saving to the **Vocabulary Vault** (`/vocabulary`).
  - **Article AI Companion:** Highlight-aware passage summarization, grounded article Q&A chat, and multi-color persistent annotations (`yellow`, `pink`, `green`, `blue`).
  - **Global Command Palette (`Ctrl+K` / `Cmd+K`):** Debounced full-text search across article titles, clean content, and AI summary bullet points.
  - **Native Audio Player:** Browser `SpeechSynthesis` playback with `0.75x`–`2x` speed switching, auto-scrolling karaoke word tracking, and unmount cleanup.
- **Strict Auth & PWA Resilience:** Cleanly isolates the `/` landing page and `/login` auth flow from the authenticated workspace (`/dashboard`, `/article/[id]`, `/vocabulary`), backed by a network-first Service Worker (`aarc-cache-v2`) that bypasses `/api/` routes, Next.js `_rsc` payloads, `/manifest.json`, and cross-origin traffic.

---

## System Architecture

```mermaid
flowchart LR
    Browser["Browser: Next.js App Router + SW aarc-cache-v2"]
    Proxy["Next.js API Proxy Routes: Auth Header + 401/403 Forwarding"]
    Cors["FastAPI Outermost CORSMiddleware"]
    Auth["JWT Auth + Multi-Tenant Routers"]
    DB[("PostgreSQL: SQLAlchemy + Alembic")]
    Groq["Groq LLM Engine"]
    Extract["YouTube Transcript API + Web Extractor"]

    Browser -->|"Static Assets + Navigations"| Browser
    Browser -->|"Same-Origin Fallback with Bearer JWT"| Proxy
    Browser -->|"Direct Preflight + API Calls"| Cors
    Proxy -->|"Forwarded Authorization Header"| Cors
    Cors --> Auth
    Auth -->|"Scoped by user_id"| DB
    Auth -->|"Truncated Prompts"| Groq
    Auth -->|"Web URL + Video ID"| Extract
```

---

## Engineering & Security Highlights

- **Multi-Tenant Data Isolation:** All article, highlight, vocabulary, and `/api/search` queries filter strictly by `user_id == current_user.id`, blocking cross-tenant reads, edits, and deletions with `404` responses and returning `409 Conflict` on cross-account URL collisions.
- **Proxy Auth Hardening:** Client helpers attach `Authorization: Bearer <token>` headers while Next.js API route handlers (`/api/search`, `/api/explain-text`, `/api/vocabulary`) forward incoming credentials and propagate `401`/`403` statuses fail-fast instead of masking auth errors.
- **Middleware & CORS Hardening:** `CORSMiddleware` is registered last in `backend/main.py`—making it the outermost ASGI middleware—to intercept `OPTIONS` preflights cleanly for production, localhost, `CORS_ORIGINS` / `ALLOWED_ORIGINS` / `FRONTEND_URL`, and Vercel preview deployments via `allow_origin_regex`.
- **Resilient AI Pipeline:** Ingestion and passage endpoints clamp prompt payloads (`40,000` characters for article summarization/tagging; `2,000`–`3,000` characters for Q&A, passage summaries, and explanations), log structured exceptions with `logger.exception`, read `GROQ_MODEL` dynamically, and degrade gracefully to static/mock fallbacks on rate limits or missing keys.
- **Schema & Code Hygiene:** Versioned, idempotent Alembic migrations (`46de59b9571c`) inspect existing tables and columns before applying changes, paired with strict TypeScript (`tsc --noEmit`) and zero-error/zero-warning ESLint enforcement across `frontend/src`.

---

## Tech Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js `16.2.11`, React `19.2.4`, TypeScript `5`, Tailwind CSS `4` | App Router UI, SSR/CSR shell, responsive editorial theming |
| **Motion & Icons** | Framer Motion `14.9`, Lucide React `1.28` | Hero animations and iconography |
| **Backend API** | FastAPI `0.109.0`, Uvicorn `0.25.0`, Pydantic `2.5.3` | Async REST API, request validation, OpenAPI docs |
| **Database & ORM** | PostgreSQL `15`, SQLAlchemy `2.0.25`, Alembic `1.13.0` | Relational persistence, WAL-ready SQLite fallback, migrations |
| **Authentication** | PyJWT `2.13.0`, Passlib `1.7.4`, Bcrypt `4.0.1` | Stateless JWT Bearer auth and password hashing |
| **AI & Extraction** | Groq `1.6.0`, LangChain Groq `0.1.10`, `youtube-transcript-api` `1.2.4`, BeautifulSoup4 `4.15.0`, HTTPX `0.28.1` | LLM summarization, ELI5 explanations, web & YouTube parsing |

---

## Repository Structure

```text
.
├── backend/
│   ├── alembic/                 # Alembic environment & versioned migrations
│   ├── api/routes/              # FastAPI routers (auth, articles, highlights, vocabulary, ai)
│   ├── core/                    # Database session lifecycle, JWT security, auth dependencies
│   ├── models/                  # SQLAlchemy ORM models & Pydantic request/response schemas
│   ├── services/                # Web/YouTube extractors and Groq LLM service layer
│   ├── main.py                  # FastAPI entrypoint, outermost CORSMiddleware, /api/search
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── public/                  # PWA manifest.json, icon.svg, Service Worker (sw.js)
│   ├── src/
│   │   ├── app/                 # App Router pages (/, /login, /dashboard, /article/[id], /vocabulary) & API proxies
│   │   ├── components/          # Sidebar, AudioPlayer, CommandPalette, TypographyToolbar, HeroAnimator, UrlInputBar
│   │   ├── context/             # AuthContext session state provider
│   │   └── lib/                 # Typed API client (api.ts) and ThemeContext
│   ├── next.config.ts           # Backend rewrite configuration
│   └── package.json             # Node dependencies & scripts
└── docker-compose.yml           # Local PostgreSQL 15 container definition
```

---

## API Reference (Summary)

All routes below are mounted under `/api/v1` (with `/api` aliases configured in `backend/main.py`).

| Method | Endpoint | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | No | Register a new user account |
| `POST` | `/api/v1/auth/login` | No | Authenticate (form-data or JSON) and return a JWT Bearer token |
| `GET` | `/api/v1/auth/me` | Yes | Fetch the current authenticated user profile |
| `POST` | `/api/v1/articles/ingest` | Yes | Ingest a web URL or YouTube video, generate summary & lowercase tags |
| `GET` | `/api/v1/articles/` | Yes | List the authenticated user's articles (optional case-insensitive `?tag=` filter) |
| `GET` | `/api/v1/articles/{article_id}` | Yes | Retrieve article details, clean content, summary, and tags |
| `DELETE` | `/api/v1/articles/{article_id}` | Yes | Delete an article owned by the current user |
| `POST` | `/api/v1/articles/{article_id}/ask` | Yes | Ask contextual questions grounded in an article or passage |
| `POST` | `/api/v1/articles/{article_id}/summarize_passage` | Yes | Summarize a highlighted passage from an owned article |
| `GET` | `/api/v1/articles/{article_id}/highlights` | Yes | Fetch highlights and notes for an owned article |
| `POST` | `/api/v1/articles/{article_id}/highlights` | Yes | Create a color-coded highlight and optional note |
| `DELETE` | `/api/v1/highlights/{highlight_id}` | Yes | Delete a highlight belonging to an owned article |
| `POST` | `/api/v1/explain-text` | Yes | Define a term (`<= 3` words) or generate an ELI5 explanation (`> 3` words) |
| `GET` | `/api/v1/vocabulary` | Yes | List saved vocabulary entries for the current user |
| `POST` | `/api/v1/vocabulary` | Yes | Save a new vocabulary term and definition |
| `DELETE` | `/api/v1/vocabulary/{vocab_id}` | Yes | Delete a saved vocabulary entry owned by the current user |
| `GET` | `/api/search` | Yes | Global search across the user's titles, content, and summary bullets |
| `GET` | `/health` | No | Backend health check |

---

## Local Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11 (`3.11.9` specified in `.python-version`)
- **PostgreSQL** 15 (via Docker Compose or local installation)
- **Groq API Key** (optional for mock mode; required for live AI features)

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` with the following variables:

| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://postgres:password@localhost:5432/ai_reader` | PostgreSQL (or SQLite) connection string |
| `SECRET_KEY` | Yes (Prod) | `replace-with-a-secure-random-secret` | Secret key used to sign JWT access tokens |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | Token lifetime in minutes |
| `GROQ_API_KEY` | No | `gsk_your_groq_api_key_here` | Enables live Groq LLM calls (mock engine used if omitted) |
| `GROQ_MODEL` | No | `llama-3.1-8b-instant` | Primary Groq model identifier |
| `SCRAPER_API_KEY` | No | `your_scraperapi_key_here` | Optional proxy key for bypassing anti-bot `403` blocks |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated extra allowed CORS origins (also checks `ALLOWED_ORIGINS` / `FRONTEND_URL`) |

Apply migrations and start the FastAPI server:

```bash
alembic upgrade head
uvicorn main:app --reload --port 8000
```

Swagger documentation will be available at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | No | `http://127.0.0.1:8000/api/v1` | Canonical FastAPI base URL used by browser API calls |
| `BACKEND_URL` | No | `http://127.0.0.1:8000` | Server-side origin used by Next.js rewrites and `/api/*` proxy routes |

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Production Deployment

AARC deploys as a decoupled frontend and backend:

- **Frontend (Vercel):** Set `NEXT_PUBLIC_API_URL` (for example, `https://your-backend.onrender.com/api/v1`) and `BACKEND_URL` (for example, `https://your-backend.onrender.com`). The manifest uses `crossOrigin="use-credentials"` and `sw.js` (`aarc-cache-v2`) bypasses API and cross-origin routes to avoid preview SSO/CORS conflicts.
- **Backend & Database (Render):** Set `DATABASE_URL`, a strong `SECRET_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, and `FRONTEND_URL` / `CORS_ORIGINS` for your production frontend origin (Vercel preview subdomains matching `^https://ai-reading-assistant.*\.vercel\.app$` are also permitted automatically). Run `alembic upgrade head` prior to starting `uvicorn main:app --host 0.0.0.0 --port $PORT`.

---

## Author

**Mohit Kumar Sharma**  
[GitHub](https://github.com/MohitKSharma2174) · [LinkedIn](https://www.linkedin.com/in/mohitksharma2174/)
