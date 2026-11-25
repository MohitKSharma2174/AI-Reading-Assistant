# AARC System Audit & Status Report

**Audit Status:** Core Systems Wired — Warnings Detected 🟡 (0 Critical Failures)  
**Date of Audit:** November 26, 2026  
**Project:** Anything Anywhere Reading Companion (AARC)  
**Scope:** End-to-End (E2E) Static & Structural Code Audit (FastAPI Backend, SQLAlchemy/Pydantic Models, Next.js App Router, React, Framer Motion)

> [!NOTE]
> **Overall Assessment:** All core backend endpoints, database models/schemas, Next.js routes, Focus Mode state controls, and component event listeners are wired up with **0 critical runtime or compilation failures** (`npx tsc --noEmit` and `python -m compileall` both exit `0`). However, several **functional edge cases and lint errors** were detected—most notably a tag-filtering case mismatch in the backend, an unguarded initial fetch on `/dashboard`, unscoped multi-tenant queries, and `eslint` exiting with code `1`—so this report flags those under **🟡 Warnings** rather than declaring "All Systems Green".

---

## 🟢 Passing

### 1. Backend Architecture & FastAPI Endpoints
- **Ingestion Routing & Global Exception Guard (`backend/main.py`, `backend/api/routes/articles.py`)**:
  - `articles_router` is mounted under `/api/v1`, `/api`, and `""`, with explicit ingestion aliases at `POST /api/articles`, `POST /api/ingest`, and `POST /api/v1/ingest` pointing to `ingest_article`.
  - `db_lock_prevention_middleware` in `backend/main.py` wraps request execution in `try...except Exception` and returns a clean JSON `500` response on unhandled pipeline errors.
- **YouTube & Web Ingestion Error Handling (`backend/api/routes/articles.py`, `backend/services/extractor.py`)**:
  - `ingest_article` wraps the full operation in `try...finally: db.close()` and performs a duplicate URL check (`Article.original_url == url_str`) returning `already_existed=True`.
  - YouTube ingestion includes `_fetch_transcript_compat` to support both newer `YouTubeTranscriptApi().fetch(vid)` (`to_raw_data()`) and legacy `YouTubeTranscriptApi.get_transcript(vid)`. The call is wrapped in `try...except Exception`, converting failures into `HTTP 400 Bad Request`.
  - Transcript segments are grouped in chunks of 6 separated by `\n\n`, and `get_youtube_title(video_id)` wraps its `httpx` oEmbed lookup in `try...except` with a safe fallback (`f"YouTube Video {video_id}"`).
  - Web article extraction calls `extract_web(url_str)` inside `try...except ValueError` (HTTP 400) and `except Exception` (HTTP 500). Inside `extractor.py`, both ScraperAPI and direct `httpx` fetches catch HTTP/network errors cleanly, and `newspaper3k` parsing falls back to `BeautifulSoup`.
  - Database persistence wraps `db.add` / `db.flush` / `db.commit` in `try...except IntegrityError` (recovering gracefully from concurrent duplicate inserts) and `except Exception` (rolling back and raising HTTP 500).
- **Groq Truncation & AI Fallbacks (`backend/api/routes/articles.py`, `backend/services/llm_service.py`, `backend/api/routes/ai.py`)**:
  - `generate_groq_summary_and_tags` (`articles.py` L90–123) truncates input via `content_text[:40000]`, attempts `["llama-3.1-8b-instant", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]` inside `try...except Exception`, and falls back to static bullets/tags when `groq_client` is unconfigured or all models fail.
  - `llm_service.py` truncates `ask_ai` and `summarize_highlight` inputs to `3000` characters (`500` chars for `question`), `generate_summary` / `generate_tags` to `40000` characters, and `explain_text` to `2000` characters, with `try...except` guards and offline mock engines when `GROQ_API_KEY` is absent.
  - `ask_article_ai` and `summarize_article_passage` (`articles.py` L402–494) explicitly close `db` in `finally` blocks prior to calling Groq to prevent SQLite write locks.
- **Global Search Endpoint (`backend/main.py`, `backend/api/routes/articles.py`)**:
  - `search_articles_endpoint` (`/api/search`, `/api/v1/search`, `/search`) and `search_articles_route` (`/articles/search`) both strip empty queries (`return []`) and execute `db.query(Article).outerjoin(Summary, Article.id == Summary.article_id)` with case-insensitive `ilike` matching across `Article.title`, `Article.clean_content`, and `cast(Summary.bullet_points, SqlString)`, ordered by `Article.created_at.desc()` and capped at `.limit(20)`.
  - `frontend/src/app/api/search/route.ts` and `frontend/src/lib/api.ts` (`searchArticles`) correctly pass `q` and `Authorization` headers to the backend search endpoints.
- **SQLAlchemy Models & Pydantic Schemas Sync (`backend/models.py`, `backend/schemas.py`, `backend/models/schema.py`, `backend/models/schemas.py`)**:
  - `backend/models.py` re-exports `models.schema` and `backend/schemas.py` re-exports `models.schemas`.
  - `Article` (`models/schema.py`) defines `media_type = Column(String, default="article", nullable=True)`, one-to-one `summary` (`Summary` with `bullet_points = Column(JSON, nullable=False)`), and many-to-many `tags` (`Tag` via `article_tags`).
  - `models/schemas.py` synchronizes `media_type`, `summary` (`SummaryResponse`), and `tags` (`TagResponse`) across `ArticleIngestRequest`, `ArticleIngestResponse`, `ArticleListResponse`, `ArticleDetailResponse`, and `SearchResultResponse` (`media_type`).
  - `main.py` calls `Base.metadata.create_all(bind=engine)` and `ensure_database_schema()` on startup to ensure `media_type` exists in SQLite and PostgreSQL.
  - **Backend Compile Verification**: `python -m compileall -q api core models services main.py models.py schemas.py` exited with code `0`.

### 2. Frontend Architecture, Routing & Components
- **Layout & Routing Isolation (`frontend/src/app/layout.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/app/dashboard/page.tsx`)**:
  - `RootLayout` (`layout.tsx`) provides `ThemeProvider`, `AuthProvider`, and global `<CommandPalette />` without hardcoding `<Sidebar />`.
  - `Sidebar.tsx` (L27–60) inspects `usePathname()`: when `pathname === '/' || pathname === '/login'`, it suppresses the `w-64` `<aside>` navigation drawer and renders only a fixed minimal top header with the AARC logo (plus a `Login` link on `/`).
  - `page.tsx` renders `<Sidebar />`, `<HeroAnimator />` (Framer Motion 3-phase animation with interval cleanup), and links to `/dashboard`.
  - `dashboard/page.tsx` renders the full 3-column layout (`Sidebar`, Library Feed with `All` / `Articles` / `Videos` smart folder tabs, and Library Analytics / Tag Explorer) and redirects unauthenticated sessions to `/login`.
- **Article View Focus Mode (`frontend/src/app/article/[id]/page.tsx`)**:
  - `isLeftExpanded` (L46) toggles the left `<aside>` between `w-64` and `w-16` icon rail (L486) via top/bottom collapse toggles; collapsed icons expand the rail on click.
  - `isRightExpanded` (L47) slides the fixed right AI Assistant `<aside>` (`w-80`) between `translate-x-0` and `translate-x-full` (L837), dynamically adjusts the center canvas right margin (`mr-80` vs `mr-0`, L744), displays a bottom-right `<Bot>` FAB when collapsed (L1186–1196), and automatically opens (`setIsRightExpanded(true)`) via `triggerSummarize` (L303) and `triggerAskAI` (L340).
- **`AudioPlayer` & `CommandPalette` Hygiene (`frontend/src/components/AudioPlayer.tsx`, `frontend/src/components/CommandPalette.tsx`)**:
  - Neither component has missing imports or unresolved variables.
  - `AudioPlayer.tsx` attaches the outside-click `mousedown` listener only while `isMenuOpen` is true and removes it in the effect cleanup (L45–57). Its unmount hook (L60–68) calls `window.speechSynthesis.cancel()` and resets highlight/playing state via `useRef` refs.
  - `CommandPalette.tsx` attaches `keydown` (`Ctrl+K` / `Cmd+K` / `Escape`, L31–43) and `open-command-palette` (L46–53) listeners on `window` and removes both in `return () => window.removeEventListener(...)`. Its 300ms debounced search `setTimeout` is cleaned up via `return () => clearTimeout(timer)` (L68–90).
  - **TypeScript Verification**: `npx tsc --noEmit` in `frontend/` exited with code `0` (0 errors).

---

## 🟡 Warnings (Potential Bugs, Edge Cases & Technical Debt)

1. **Tag Filtering Case-Mismatch Bug (`backend/api/routes/articles.py`)**:
   - `ingest_article` (L243–253) persists tags using original casing (`t_clean = t_name.strip()`, e.g., `"Insights"`, `"Reading"`, `"General"`), whereas `get_articles` (L306–308) lowercases the incoming filter (`tag_lower = tag.strip().lower()`) and performs an exact comparison `Tag.name == tag_lower`. Selecting any tag containing uppercase characters in `/dashboard`'s Tag Explorer returns `[]`. (By contrast, `ai_service.py` L102 normalizes tags with `.lower()`).
2. **Dashboard Fetches Articles Before Auth Check Resolves (`frontend/src/app/dashboard/page.tsx`)**:
   - L62–64 executes `fetchArticlesData(selectedTag)` unconditionally on mount instead of guarding on `if (isAuthenticated)` (unlike `vocabulary/page.tsx` L54 and `article/[id]/page.tsx` L197). Unauthenticated visits trigger a `401` request to `/api/v1/articles/` and briefly flash `"Failed to fetch articles"` before `router.push('/login')` completes.
3. **Unscoped Multi-Tenant Access & Unauthenticated AI Endpoint (`articles.py`, `highlights.py`, `main.py`, `ai.py`)**:
   - `get_articles`, `get_article`, `delete_article`, `ask_article_ai`, and `summarize_article_passage` (`backend/api/routes/articles.py`), as well as `create_highlight`, `get_highlights`, and `delete_highlight` (`backend/api/routes/highlights.py`), require `current_user` but do not scope queries or delete checks by `Article.user_id == current_user.id`.
   - `/api/search` (`backend/main.py` L124 and `articles.py` L318) injects `get_optional_current_user` without using it, allowing unauthenticated requests to search across all stored articles.
   - `POST /api/v1/explain-text` (`backend/api/routes/ai.py`) has no authentication dependency.
4. **Frontend ESLint Failures (`npx eslint src` exited with code `1` — 39 errors, 40 warnings)**:
   - `react-hooks/set-state-in-effect` errors in `dashboard/page.tsx` (L63), `CommandPalette.tsx` (L62, L71), `HeroAnimator.tsx` (L47), `NetworkStatus.tsx` (L11), `TypographyToolbar.tsx` (L95), and `ThemeContext.tsx` (L23).
   - `react-hooks/refs` error in `AudioPlayer.tsx` (L37: mutating `playbackRateRef.current` during render).
   - `@typescript-eslint/no-explicit-any` errors in `lib/api.ts`, `article/[id]/page.tsx`, `dashboard/page.tsx`, `login/page.tsx`, `UrlInputBar.tsx`, and Next.js `/api/*` route handlers.
   - `react/no-unescaped-entities` errors in `article/[id]/page.tsx` (L906, L1006, L1130) and `CommandPalette.tsx` (L133).
   - Unused imports/variables (`@typescript-eslint/no-unused-vars`), including `Link` in `CommandPalette.tsx` (L4), `cycleSpeed` in `AudioPlayer.tsx` (L204), `triggerAskAI` in `article/[id]/page.tsx` (L339), and unused icons/hooks in `dashboard/page.tsx` and `vocabulary/page.tsx`.
5. **LLM Service Error Masking, Model Hardcoding & DB Session Timing (`backend/services/llm_service.py`, `backend/api/routes/articles.py`)**:
   - `llm_service.py` L31 configures `ChatGroq` with a single hardcoded model (`"qwen/qwen3.8-27b"`) and no fallback list (unlike `articles.py` L98 which tries `"llama-3.1-8b-instant"` first).
   - `ask_ai` (L102–107) and `summarize_highlight` (L136–140) return `TOKEN_LIMIT_FALLBACK` for *all* exceptions, masking non-token errors (such as invalid model IDs, network errors, or API auth failures).
   - `ingest_article` (`articles.py` L138–294) keeps the SQLAlchemy `db` session open while awaiting external YouTube/web fetches and Groq API calls.
6. **YouTube URL Substring Detection & Python `SyntaxWarning` (`backend/api/routes/articles.py`)**:
   - L159 uses `"youtube.com" in url_str or "youtu.be" in url_str` instead of hostname parsing, which can misclassify web URLs containing those strings in query params or paths.
   - L49 docstring contains `\/`, emitting `SyntaxWarning: "\/" is an invalid escape sequence` during `python -m compileall`.
7. **Component & Layout Edge Cases**:
   - **Mobile Focus Mode & Dashboard Overflow**: `article/[id]/page.tsx` (L744) applies `mr-80` (320px) unconditionally when `isRightExpanded` is true, and `dashboard/page.tsx` (L317) renders a fixed `w-80` right sidebar without `hidden lg:flex`, leaving narrow viewports cramped.
   - **`AudioPlayer.tsx` Speed-Switch Timeout (L193–196)**: `applySpeed` schedules a `30ms` `setTimeout` to call `startSpeech` without canceling the timer on unmount; unmounting immediately after a speed change could invoke `synth.speak()` after unmount cleanup ran.
   - **`CommandPalette.tsx` Search Race Condition & Focus Timer (L58, L77–87)**: In-flight `searchArticles` requests have no `ignore`/abort guard, so a slower prior request can overwrite newer results; the 50ms focus `setTimeout` is not cleared on close/unmount.
   - **Magic Tooltip Viewport Clipping (`article/[id]/page.tsx` L1200–1207)**: Positioned via `-translate-x-1/2 -translate-y-full` without clamping near viewport edges.
   - **Collapsed Sidebar Navigation & Redirect Inconsistencies**: In `article/[id]/page.tsx` (L491–492, L561, L570, L602), clicking `Library`, `Vocabulary`, or `All Articles` while `!isLeftExpanded` calls `e.preventDefault()` to expand the sidebar rather than navigating; the reader logo navigates to `/` whereas `Sidebar.tsx` navigates to `/dashboard`. In `vocabulary/page.tsx` (L334), ingesting from the modal redirects to `'/'` instead of `'/dashboard'`.
8. **Missing Alembic Migrations & Miscellaneous Debt**:
   - `backend/alembic/versions/` stops at `0b66c5237167` and lacks Alembic migration revisions for `articles.media_type` and the `vocabularies` table (relying on `Base.metadata.create_all` and `ensure_database_schema()`).
   - `backend/models/__init__.py` omits `SearchResultResponse`.
   - `backend/main.py` contains unused imports/instances (`re`, `YouTubeTranscriptApi`, `extract_video_id`, `groq_client`), and `load_dotenv()` without explicit paths depends on running from `backend/`.
   - Unused components: `frontend/src/components/Navbar.tsx` and `frontend/src/components/NetworkStatus.tsx`.

---

## 🔴 Critical Failures

**None.** No critical blockers were found:
- `0` Python bytecode compilation errors (`python -m compileall` exited `0`)
- `0` TypeScript compilation errors (`npx tsc --noEmit` exited `0`)
- `0` missing imports or unresolved variables in `AudioPlayer.tsx`, `CommandPalette.tsx`, or route pages
- `0` unclosed global event listeners (`Ctrl+K` / `Cmd+K` / `Escape`, `open-command-palette`, `AudioPlayer` outside-click, or speech synthesis teardown)
- `0` unprotected ingestion crashes (`youtube-transcript-api`, `extract_web`, and Groq truncation paths all have `try...except` handling)
