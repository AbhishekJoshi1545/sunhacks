# Bugfix Requirements Document

## Introduction

The Organizational Memory and Reasoning Engine currently behaves as a passive chatbot with mock/simulated data flows. The system has the structural scaffolding of a multi-agent platform (agents, workflow state, graph DB, vector DB, action center, audit logs) but the agents do not operate autonomously, ingestion is mock-injected rather than real, actions are simulated rather than executed, and the frontend UX still centers on a chat interface rather than an operations console. This spec captures the defective behaviors and defines the correct behaviors needed to upgrade the prototype into a production-ready MVP that is genuinely agentic, autonomous, and demo-ready.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the ingestion agent runs THEN the system injects a hardcoded mock `google_drive` event on a 60-second timer instead of processing real organizational data from connected sources.

1.2 WHEN a Slack token is configured THEN the system only polls the first channel and fetches only 5 messages, with no deduplication persistence across restarts, causing re-processing of already-seen events.

1.3 WHEN the extraction agent processes text THEN the system calls Ollama synchronously in the request thread, blocking the API and causing timeouts on large documents.

1.4 WHEN an action is executed THEN the system logs a simulated string to the audit trail instead of triggering any real external hook (task creation, notification, escalation).

1.5 WHEN the workflow state machine processes an event THEN the system stores active events only in memory (`self.active_events` dict), losing all pending approvals and in-flight states on server restart.

1.6 WHEN the frontend loads THEN the system presents a chat interface as the primary interaction model, with the operations console (dashboard, action center, audit logs) as secondary navigation, inverting the intended UX priority.

1.7 WHEN the dashboard renders THEN the system displays hardcoded static values ("1,204 sources", "8,932 agent actions", "92.4% confidence") instead of live data from the backend.

1.8 WHEN the decision lifecycle progresses THEN the system only tracks two meaningful states (`pending_approval`, `executed`) and lacks the full lifecycle: `draft → proposed → approved → executed → archived`.

1.9 WHEN the graph DB saves a decision THEN the system does not record timestamps, alternatives considered, deadlines, risks, or dependencies — losing critical decision intelligence.

1.10 WHEN the API serves decisions THEN the system returns `"date": "Extracted Auto"` as a static string instead of a real extraction timestamp.

1.11 WHEN the frontend Action Center polls for pending actions THEN the system calls `http://localhost:3001` hardcoded instead of using the centralized API client, making environment configuration fragile.

1.12 WHEN the backend starts THEN the system has no `/api/agent-status` endpoint, so the frontend cannot display live agent health or ingestion pipeline status.

1.13 WHEN the DocumentUploadPage is used THEN the system is not linked in the sidebar navigation, making manual ingestion inaccessible from the main UI.

1.14 WHEN the retrieval agent queries the graph THEN the system uses a naive keyword split on whitespace with a `len(term) > 4` filter, missing multi-word concepts and producing low-quality graph context.

1.15 WHEN the action agent executes THEN the system does not store a reversibility record or rollback reference, violating the auditability requirement.

### Expected Behavior (Correct)

2.1 WHEN the ingestion agent runs THEN the system SHALL process real organizational data by supporting file/document upload ingestion end-to-end, with the mock event replaced by a clearly-labeled demo fixture that is opt-in only.

2.2 WHEN a Slack token is configured THEN the system SHALL persist processed message timestamps to disk so deduplication survives restarts, and SHALL poll all configured channels up to a configurable limit.

2.3 WHEN the extraction agent processes text THEN the system SHALL run Ollama calls in a background thread or async task so the API returns immediately with a job ID, and the frontend SHALL poll for completion status.

2.4 WHEN an action is executed THEN the system SHALL invoke real action hooks for at least: (a) writing a decision record to the graph DB, (b) logging a structured audit entry with timestamp and actor, and (c) emitting a notification payload to a configurable webhook URL if set.

2.5 WHEN the workflow state machine processes an event THEN the system SHALL persist `EventState` to the `audit_data.json` file at every status transition, so pending approvals and in-flight states survive restarts.

2.6 WHEN the frontend loads THEN the system SHALL present the Operations Dashboard as the default landing page with the chat interface demoted to a secondary utility tab, and the sidebar SHALL surface ingestion status and agent activity prominently.

2.7 WHEN the dashboard renders THEN the system SHALL fetch live counts from `/api/decisions`, `/api/audit-logs`, and `/api/agent-status` and display real values for decisions extracted, sources processed, agent actions taken, and system health.

2.8 WHEN the decision lifecycle progresses THEN the system SHALL enforce the full state machine: `ingested → extracting → proposed → pending_approval → approved → executing → executed → archived`, with each transition logged to the audit trail.

2.9 WHEN the graph DB saves a decision THEN the system SHALL record: extraction timestamp, alternatives considered (from LLM output), deadline if mentioned, risk level, and dependency references alongside the existing fields.

2.10 WHEN the API serves decisions THEN the system SHALL return a real ISO-8601 timestamp derived from the event processing time.

2.11 WHEN any frontend component makes API calls THEN the system SHALL use the centralized `api/client.js` axios instance so the base URL is configured in one place.

2.12 WHEN the backend starts THEN the system SHALL expose a `/api/agent-status` endpoint returning the name, last-run time, and health status of each agent (ingestion, extraction, retrieval, reasoning, action, state).

2.13 WHEN the sidebar renders THEN the system SHALL include a link to the Manual Ingestion page so operators can trigger ad-hoc ingestion without navigating directly to a URL.

2.14 WHEN the retrieval agent queries the graph THEN the system SHALL use normalized token matching that handles multi-word phrases and SHALL rank results by relevance score rather than returning the first 5 matches.

2.15 WHEN the action agent executes THEN the system SHALL write a reversibility record containing the action type, payload, timestamp, and a `can_rollback` flag to the audit log so operators can identify reversible actions.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a query is submitted via the chat interface THEN the system SHALL CONTINUE TO run the full RAG pipeline (vector retrieval → graph retrieval → Ollama reasoning → structured response) and return answer, reasoning steps, sources, and confidence score.

3.2 WHEN text is submitted via the manual ingestion page THEN the system SHALL CONTINUE TO route it through the full autonomous pipeline: ingestion → extraction → state classification → action routing → audit logging.

3.3 WHEN an action requires human approval (medium/high impact) THEN the system SHALL CONTINUE TO pause at `pending_approval` status and surface the action in the Action Center for human review before execution.

3.4 WHEN a human approves or rejects an action in the Action Center THEN the system SHALL CONTINUE TO call `handle_approval` on the workflow manager and transition the event state accordingly.

3.5 WHEN the audit log page loads THEN the system SHALL CONTINUE TO display the full agent trace (all `audit_log` entries) for every processed event, with source type and final status visible.

3.6 WHEN the Decision Explorer loads THEN the system SHALL CONTINUE TO fetch and display all decisions stored in the graph DB, with search and filter UI available.

3.7 WHEN Chroma vector storage is used THEN the system SHALL CONTINUE TO use the persistent `chroma_data/` directory so embeddings survive restarts.

3.8 WHEN the NetworkX graph is used THEN the system SHALL CONTINUE TO persist to `graph_data.json` on every write so the decision graph survives restarts.

3.9 WHEN the backend starts THEN the system SHALL CONTINUE TO launch the background ingestion thread automatically via the FastAPI `startup` event.

3.10 WHEN CORS is configured THEN the system SHALL CONTINUE TO allow requests from the frontend URL defined in the `FRONTEND_URL` environment variable.
