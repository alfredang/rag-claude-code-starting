# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RAG chatbot for course materials powered by the Claude Agent SDK. Authenticates via Claude Code CLI OAuth token — no API key needed. Do NOT set `ANTHROPIC_API_KEY` in the environment, as it overrides CLI auth and causes errors.

## Commands

```bash
# Install dependencies
uv sync

# Run the app (starts FastAPI on http://localhost:8002)
./run.sh
# Or manually:
cd backend && uv run uvicorn app:app --reload --port 8002
```

There are no tests or linting configured in this project.

## Architecture

**Backend (Python/FastAPI)** serves a **vanilla HTML/JS/CSS frontend** as static files. No frontend build step.

### Request Flow

1. Frontend POSTs to `/api/query` with user question + session ID
2. `app.py` offloads to a thread via `anyio.to_thread.run_sync` (keeps event loop free)
3. `rag_system.py` calls `ai_generator.generate_response()`, which uses `anyio.from_thread.run` to schedule the async SDK call back on the main event loop
4. `ai_generator.py` spawns a Claude instance via Agent SDK with a **fresh MCP server per query** exposing `search_course_content` as a tool
5. Claude autonomously decides when to call the search tool (tool-based RAG, not pre-search)
6. `search_tools.py` executes the tool call against `vector_store.py` (ChromaDB), which uses two collections: `course_catalog` (metadata/name resolution) and `course_content` (text chunks)
7. Response + source links returned to frontend

### Key Design Details

- **Fresh MCP server per query**: `_create_mcp_server()` is called in `_async_generate()`, not cached — avoids stale state across event loops
- **Thread/async bridge**: The `anyio.to_thread.run_sync` → `anyio.from_thread.run` pattern is required because the Agent SDK is async but `rag_system.query()` is sync
- **Sentence-aware chunking**: `document_processor.py` splits on sentence boundaries with configurable overlap (800 chars / 100 overlap by default in `config.py`)
- **In-memory sessions**: `session_manager.py` stores conversation history (max 2 exchanges) — lost on restart
- **Course documents** in `docs/` are auto-loaded on server startup; format requires `Course Title:`, `Course Instructor:`, and `Lesson N:` headers

### API Endpoints

- `POST /api/query` — `{query, session_id?}` → `{answer, sources, session_id}`
- `POST /api/new-chat` — Create new session
- `GET /api/courses` — Course count and titles
