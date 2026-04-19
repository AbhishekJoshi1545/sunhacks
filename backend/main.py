import os
from typing import Any, Dict, List, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.ingestion import ingest_source_event, start_ingestion_thread
from agents.reasoning import generate_answer
from agents.retrieval import retrieve_context
from agents.state_agent import workflow_manager
from db.chroma import inspect_recent_sources
from db.local_graph import graph_db

from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()


# 🔄 Lifespan (start ingestion thread)
@asynccontextmanager
async def lifespan(app: FastAPI):
    start_ingestion_thread()
    yield


# 🚀 Create FastAPI app
app = FastAPI(
    title="Organizational Memory API",
    lifespan=lifespan
)

# ✅ FIXED CORS (WORKS 100%)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all for development
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 📦 Models
class QueryRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None


class QueryResponse(BaseModel):
    answer: str
    reasoning_steps: List[str]
    sources: List[Dict[str, Any]]
    confidence: float


class IngestRequest(BaseModel):
    source: str
    data: Optional[Dict[str, Any]] = None


class ApprovalRequest(BaseModel):
    id: str
    action: str


# 🧠 Helper function to extract text
def _build_ingest_text(req: IngestRequest) -> str:
    data = req.data or {}

    if isinstance(data.get("text"), str) and data["text"].strip():
        return data["text"].strip()

    if isinstance(data.get("message"), str) and data["message"].strip():
        return data["message"].strip()

    subject = data.get("subject")
    body = data.get("body")

    if isinstance(subject, str) and subject.strip():
        if isinstance(body, str) and body.strip():
            return f"{subject.strip()}\n\n{body.strip()}"
        return subject.strip()

    if isinstance(data.get("name"), str) and data["name"].strip():
        return data["name"].strip()

    return ""


# 🩺 Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Autonomous Engine running."}


# 📊 System status
@app.get("/api/system/status")
def system_status():
    agent_status = workflow_manager.get_agent_status()
    decisions = graph_db.get_all_decisions()
    actions = graph_db.get_action_records()
    workflows = workflow_manager.list_workflow_states()

    return {
        "agents": agent_status,
        "metrics": {
            "decisions_total": len(decisions),
            "actions_total": len(actions),
            "workflows_total": len(workflows),
            "pending_approvals": agent_status["totals"]["pending_approvals"],
        },
    }


# 🤖 Agent status
@app.get("/api/agents/status")
def agent_status():
    return workflow_manager.get_agent_status()


# 💬 Query endpoint
@app.post("/api/query", response_model=QueryResponse)
def handle_query(req: QueryRequest):
    result = generate_answer(req.query)
    return QueryResponse(**result)


# 🔍 Retrieval debug
@app.post("/api/retrieval")
def retrieval_inspection(req: QueryRequest):
    context = retrieve_context(req.query)
    return {
        "vector_results": context.get("vector_results", []),
        "graph_context": context.get("graph_context", []),
    }


# 📥 Ingestion endpoints
@app.post("/api/ingest")
def handle_ingest(req: IngestRequest):
    text = _build_ingest_text(req)

    if not text:
        return {"status": "ignored", "message": "No text content found."}

    ingest_source_event(req.source, text, req.data)
    return {"status": "success", "message": f"{req.source} data entered pipeline."}


@app.post("/api/ingest/chat")
def ingest_chat(req: IngestRequest):
    text = _build_ingest_text(req)

    if not text:
        return {"status": "ignored", "message": "No chat text found."}

    ingest_source_event("chat", text, req.data)
    return {"status": "success", "message": "Chat data ingested."}


@app.post("/api/ingest/slack")
def ingest_slack(req: IngestRequest):
    text = _build_ingest_text(req)

    if not text:
        return {"status": "ignored", "message": "No Slack text found."}

    ingest_source_event("slack", text, req.data)
    return {"status": "success", "message": "Slack data ingested."}


@app.post("/api/ingest/gmail")
def ingest_gmail(req: IngestRequest):
    text = _build_ingest_text(req)

    if not text:
        return {"status": "ignored", "message": "No Gmail text found."}

    ingest_source_event("gmail", text, req.data)
    return {"status": "success", "message": "Gmail data ingested."}


@app.post("/api/ingest/gdrive")
def ingest_gdrive(req: IngestRequest):
    text = _build_ingest_text(req)

    if not text:
        return {"status": "ignored", "message": "No Drive text found."}

    ingest_source_event("gdrive", text, req.data)
    return {"status": "success", "message": "Drive data ingested."}


# 📚 Decisions
@app.get("/api/decisions")
def list_decisions():
    return {"decisions": graph_db.get_all_decisions()}


# ⏳ Pending actions
@app.get("/api/actions/pending")
def list_pending_actions():
    pending = []

    for ev in workflow_manager.active_events.values():
        if ev.status == "pending_approval":
            pending.append(ev.model_dump())

    return {"pending": pending}


# 📜 Action history
@app.get("/api/actions/history")
def list_action_history():
    return {"actions": graph_db.get_action_records()}


# 🔄 Workflows
@app.get("/api/workflows")
def list_workflows():
    return {"workflows": workflow_manager.list_workflow_states()}


# 📥 Recent sources
@app.get("/api/sources/recent")
def recent_sources(limit: int = 10):
    return {"sources": inspect_recent_sources(limit=limit)}


# ✅ Approve action
@app.post("/api/actions/approve")
def approve_action(req: ApprovalRequest):
    success = workflow_manager.handle_approval(req.id, req.action == "approve")
    return {"success": success}


# 📜 Audit logs
@app.get("/api/audit-logs")
def get_audit_logs():
    return {"logs": graph_db.get_all_audit_logs()}


# 🚀 Run server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001, reload=True)