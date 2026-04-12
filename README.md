# Organizational Memory And Reasoning Engine

## Overview
This MVP is an autonomous multi-agent organizational memory platform. It ingests source events, extracts decisions, routes actions, and persists audit trails.

It is operations-first, with chat as a secondary interface.

## Core Agents
- Ingestion Agent: collects source events (Slack polling plus manual source intake).
- Extraction Agent: parses decision intelligence from source text.
- Retrieval Agent: searches vector and graph memory for context.
- Reasoning Agent: composes query answers from retrieved context.
- Action Agent: executes approved or low-risk actions.
- Memory/State Agent: persists workflow state, decisions, and audit logs.

## Workflow Lifecycle
- detected
- parsed
- approval_pending or approved
- executed
- archived

## Storage
- Vector memory: Chroma persisted under `backend/chroma_data`.
- Graph and workflow memory: local NetworkX + JSON files:
	- `backend/graph_data.json`
	- `backend/audit_data.json`
	- `backend/action_data.json`

## API Endpoints
- `GET /health`
- `GET /api/system/status`
- `GET /api/agents/status`
- `POST /api/ingest`
- `POST /api/ingest/chat`
- `POST /api/ingest/slack`
- `POST /api/ingest/gmail`
- `POST /api/ingest/gdrive`
- `POST /api/query`
- `POST /api/retrieval`
- `GET /api/decisions`
- `GET /api/workflows`
- `GET /api/actions/pending`
- `POST /api/actions/approve`
- `GET /api/actions/history`
- `GET /api/sources/recent`
- `GET /api/audit-logs`

## Run Backend
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

## Run Frontend
```powershell
cd frontend
npm install
npm run dev
```

## Optional LLM Runtime
For high-quality extraction and reasoning, run Ollama with:
- model `llama3`
- embeddings model `nomic-embed-text`

If Ollama is unavailable, the extraction agent falls back to deterministic heuristics so workflow automation remains functional.

## Where To Add Sources
- Chat input and manual payload shaping: `backend/main.py`
- Background source polling and connector hooks: `backend/agents/ingestion.py`
- Decision parsing and schema extraction: `backend/agents/extraction.py`
- Workflow state, approvals, and execution routing: `backend/agents/state_agent.py`
- Persistence for decisions, actions, and audit logs: `backend/db/local_graph.py`
- Vector memory writes and recent source inspection: `backend/db/chroma.py`

If you want to wire a real Gmail or Google Drive connector, the right place is `backend/agents/ingestion.py`. Add the API call there, then call `ingest_source_event("gmail", ...)` or `ingest_source_event("gdrive", ...)` with the normalized text and metadata.

For Slack, the current poller already lives in `backend/agents/ingestion.py`. Chat-style manual messages go through `/api/ingest/chat` in `backend/main.py`.

The backend launch is cleanest with:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python main.py
```

Set `UVICORN_RELOAD=true` only if you want autoreload during development.

## Frontend Sections
- Operations Dashboard
- Pending Actions
- Decision DB
- Audit Logs
- Source Intake
- Chat Interface

## MVP Notes
- Human approval is required for medium/high impact action plans.
- Low-risk events can execute action plans automatically.
- All workflow transitions and action executions are captured in audit logs.
"# organizational_memory" 
"# organizational_memory" 
"# sunhacks" 
