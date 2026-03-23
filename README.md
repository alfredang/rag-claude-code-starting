# rag-claude-code-starting

A RAG (Retrieval-Augmented Generation) chatbot for course materials, powered by the Claude Agent SDK. Ask questions about course content and get accurate, source-cited answers.

## Architecture

- **Backend**: FastAPI server with ChromaDB vector store and Claude Agent SDK
- **Frontend**: Static HTML/CSS/JS chat interface
- **AI**: Uses Claude Agent SDK with MCP (Model Context Protocol) for tool-based search — no API key needed, authenticates via Claude Code CLI's OAuth token

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (authenticated — the Agent SDK uses your CLI session)

## Setup

1. **Install uv** (if not already installed):

   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Clone the repo**:

   ```bash
   git clone https://github.com/alfredang/rag-claude-code-starting.git
   cd rag-claude-code-starting
   ```

3. **Install dependencies**:

   ```bash
   uv sync
   ```

4. **Add course documents** to the `docs/` folder (`.txt`, `.pdf`, or `.docx` format). A sample course is included.

## Running

```bash
chmod +x run.sh
./run.sh
```

This starts the FastAPI server on **http://localhost:8002**. The app loads course documents from `docs/` on startup.

Alternatively, run manually:

```bash
cd backend
uv run uvicorn app:app --reload --port 8002
```

## Course Document Format

Course files should follow this structure:

```
Course Title: [Title]
Course Link: [URL]
Course Instructor: [Name]

Lesson 0: [Lesson Title]
Lesson Link: [URL]
[Content...]

Lesson 1: [Lesson Title]
[Content...]
```

## Project Structure

```
├── backend/
│   ├── app.py                 # FastAPI endpoints
│   ├── ai_generator.py        # Claude Agent SDK integration
│   ├── rag_system.py          # RAG orchestrator
│   ├── vector_store.py        # ChromaDB vector storage
│   ├── document_processor.py  # Course document parsing
│   ├── search_tools.py        # MCP tool definitions
│   ├── session_manager.py     # Conversation sessions
│   ├── config.py              # Configuration
│   └── models.py              # Data models
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── docs/                      # Course materials
├── run.sh                     # Start script
└── pyproject.toml             # Python dependencies
```
