# Software Requirements Specification (SRS)
# Organizational Memory & Reasoning Engine

**Version:** 1.0  
**Date:** April 2026  
**Status:** Draft  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Stakeholders & User Roles](#3-stakeholders--user-roles)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture](#6-system-architecture)
7. [MCP Integration Specification](#7-mcp-integration-specification)
8. [Data Models](#8-data-models)
9. [API Specification](#9-api-specification)
10. [UI/UX Requirements](#10-uiux-requirements)
11. [Security Requirements](#11-security-requirements)
12. [Constraints & Assumptions](#12-constraints--assumptions)
13. [Glossary](#13-glossary)

---

## 1. Introduction

### 1.1 Purpose

This document defines the Software Requirements Specification (SRS) for the **Organizational Memory & Reasoning Engine** — an AI-powered knowledge management platform that captures, preserves, and intelligently surfaces organizational decisions and their reasoning across scattered communication channels.

### 1.2 Scope

The system ingests data from Slack, Gmail, and Google Drive via Model Context Protocol (MCP) servers, extracts structured knowledge (decisions, reasoning, people, dates), stores it in a hybrid vector + graph database, and serves answers through a Retrieval-Augmented Generation (RAG) pipeline backed by a local LLM.

### 1.3 Problem Statement

Organizations routinely lose institutional knowledge because:

- Decisions are buried in Slack threads, email chains, and ad-hoc documents
- The **reasoning** behind decisions is never formally recorded
- New employees have no structured way to understand historical context
- No single system connects *what* was decided with *why* and *by whom*

### 1.4 Proposed Solution

A centralized AI reasoning engine that:

- Continuously ingests data from communication and document tools
- Extracts and stores structured decision records with context
- Enables natural-language querying of organizational history
- Returns answers with source citations and explainable reasoning

### 1.5 Definitions & Acronyms

| Term | Definition |
|------|------------|
| MCP | Model Context Protocol — a standard for connecting LLMs to external tools/data |
| RAG | Retrieval-Augmented Generation — combining search with LLM generation |
| LLM | Large Language Model |
| Embedding | A numeric vector representation of text for semantic search |
| ChromaDB | Open-source vector database |
| Qdrant | Production-grade vector database |
| Neo4j | Graph database used for storing entity relationships |
| Ollama | Local LLM runtime |
| LangChain | Framework for building LLM-powered pipelines |

---

## 2. Overall Description

### 2.1 Product Perspective

The system sits as an **intelligence layer** on top of existing organizational tools. It does not replace Slack, Gmail, or Google Drive — it indexes, understands, and connects their content into a queryable organizational memory.

```
┌──────────────────────────────────────────────────────┐
│              EXISTING TOOLS (Data Sources)           │
│   Slack           Gmail           Google Drive       │
└────────┬──────────────┬─────────────────┬────────────┘
         │  MCP Servers │                 │
         ▼              ▼                 ▼
┌──────────────────────────────────────────────────────┐
│              INGESTION & PROCESSING LAYER            │
│    LangChain Pipeline + Sequential Thinking MCP      │
└────────────────────────┬─────────────────────────────┘
                         │
         ┌───────────────┴──────────────┐
         ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│   Vector DB     │          │      Neo4j Graph DB   │
│ (Chroma/Qdrant) │          │  (Entities & Links)   │
└────────┬────────┘          └──────────┬────────────┘
         └──────────────┬───────────────┘
                        ▼
              ┌──────────────────┐
              │  RAG Pipeline    │
              │  (LangChain)     │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Ollama LLM      │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  React Frontend  │
              └──────────────────┘
```

### 2.2 Product Functions Summary

- **Ingest** messages, emails, and documents via MCP
- **Extract** structured knowledge records (decision, reason, people, date)
- **Store** embeddings in vector DB and relationships in Neo4j
- **Query** via natural language
- **Respond** with answers, sources, and step-by-step reasoning

### 2.3 Operating Environment

| Component | Technology |
|-----------|-----------|
| Backend Runtime | Node.js v20+ |
| AI Orchestration | LangChain.js |
| Local LLM | Ollama (llama3 / mistral) |
| Vector Database | ChromaDB (dev) / Qdrant (prod) |
| Graph Database | Neo4j 5.x |
| Frontend | React 18 + Vite |
| MCP Integration | Anthropic MCP SDK |
| Containerization | Docker + Docker Compose |

---

## 3. Stakeholders & User Roles

### 3.1 Primary Users

| Role | Description | Primary Use Case |
|------|-------------|-----------------|
| **Developer** | Engineers on the team | "Why did we choose this tech stack?" |
| **Manager** | Team leads and PMs | "Who approved the migration to AWS?" |
| **Analyst** | Data/business analysts | "What decisions were made around Q3 2025?" |
| **New Employee** | Recently onboarded staff | "What's the history behind this system?" |
| **System Administrator** | Manages the platform | Configuration, MCP setup, monitoring |

### 3.2 Stakeholder Needs

| Stakeholder | Need |
|-------------|------|
| Developers | Fast lookup of technical decisions with source links |
| Managers | Visibility into who made decisions and when |
| Analysts | Ability to query decision trends across time |
| New Employees | Onboarding knowledge base with context |
| Org Leadership | Audit trail and accountability of key decisions |

---

## 4. Functional Requirements

### FR-01: Data Ingestion — Slack

**Priority:** High  
**Description:** The system shall connect to Slack workspaces via the Slack MCP server and fetch messages, threads, and channel history.

**Acceptance Criteria:**
- System fetches messages from specified channels (configurable via `mcp_config.json`)
- Each message is captured with: `text`, `user`, `channel`, `timestamp`, `thread_ts`
- System handles pagination for large channel histories
- Incremental sync: only fetch messages newer than the last ingestion timestamp
- Rate limits respected per Slack API guidelines

**Input Schema (per message):**
```json
{
  "source": "slack",
  "channel": "engineering",
  "text": "We decided to use MongoDB for its horizontal scalability.",
  "user": "U012345",
  "timestamp": "2026-04-01T10:30:00Z",
  "thread_ts": "1712001234.567890"
}
```

---

### FR-02: Data Ingestion — Gmail

**Priority:** High  
**Description:** The system shall connect to Gmail via the Gmail MCP server and extract decision-relevant emails.

**Acceptance Criteria:**
- Fetches emails from configured labels or folders (e.g., "Architecture Decisions")
- Captures: `subject`, `from`, `to`, `cc`, `body`, `date`, `message_id`
- HTML emails are stripped to plain text before processing
- Email threads are grouped and treated as a single conversational unit
- Attachments (PDF, DOCX) are passed to the Document Processing pipeline

---

### FR-03: Data Ingestion — Google Drive

**Priority:** High  
**Description:** The system shall connect to Google Drive via the Google Drive MCP server and process documents, meeting notes, and decision logs.

**Acceptance Criteria:**
- Fetches Google Docs, Sheets, and uploaded files (PDF, DOCX) from specified folders
- Captures: `title`, `content`, `last_modified`, `owner`, `document_id`
- Documents are chunked into sections of ~500 tokens with 50-token overlap
- Supports delta sync (only re-process modified documents)

---

### FR-04: Knowledge Extraction

**Priority:** Critical  
**Description:** The system shall extract structured decision records from raw ingested text using the Sequential Thinking MCP and an LLM-powered extraction pipeline.

**Acceptance Criteria:**
- For each ingested chunk, the system attempts to identify if a decision is present
- Extracted record follows the canonical Decision Schema (see Section 8.1)
- Confidence score > 0.7 required for a record to be committed to storage
- Non-decision content is stored only in the vector DB (not as a Decision record in Neo4j)
- Extraction runs asynchronously in a queue-based worker

**Extracted Decision Schema:**
```json
{
  "decision_id": "uuid-v4",
  "decision": "Use MongoDB as primary database",
  "reason": "Horizontal scalability and flexible schema fit our use case",
  "people": ["rahul@company.com", "priya@company.com"],
  "date": "2026-04-01",
  "source": {
    "type": "slack",
    "channel": "architecture",
    "url": "https://slack.com/archives/..."
  },
  "tags": ["database", "backend", "q2-2026"],
  "confidence": 0.92
}
```

---

### FR-05: Vector Storage (Semantic Search Layer)

**Priority:** Critical  
**Description:** The system shall generate text embeddings for all ingested content and store them in a vector database for semantic retrieval.

**Acceptance Criteria:**
- All ingested text chunks (not just decisions) are embedded using `nomic-embed-text` or `text-embedding-3-small`
- Embeddings are stored in ChromaDB (development) / Qdrant (production) with associated metadata
- Metadata includes: `source_type`, `source_id`, `date`, `people`, `decision_id` (if applicable)
- Vector search returns top-k (default: 5) semantically relevant chunks for any query
- Cosine similarity threshold > 0.6 for results to be returned

---

### FR-06: Graph Storage (Relationship Layer)

**Priority:** High  
**Description:** The system shall store entity relationships in Neo4j to enable relational queries (who made what decision, which decisions are related, etc.).

**Acceptance Criteria:**
- The following node types shall be created: `Decision`, `Person`, `Project`, `Tool`, `Source`
- The following relationship types shall be supported:
  - `(Person)-[:MADE]->(Decision)`
  - `(Decision)-[:PART_OF]->(Project)`
  - `(Decision)-[:REFERENCES]->(Tool)`
  - `(Decision)-[:SOURCED_FROM]->(Source)`
  - `(Decision)-[:RELATED_TO]->(Decision)`
- Querying "who made this decision" resolves via Neo4j Cypher traversal
- Graph is updated atomically when a new Decision record is committed

---

### FR-07: Natural Language Query Interface

**Priority:** Critical  
**Description:** Users shall be able to ask questions in plain English about organizational history and decisions.

**Acceptance Criteria:**
- System accepts free-text queries via the frontend chat interface and REST API
- Query is processed through the RAG pipeline (see FR-08)
- Supported query types:
  - Factual: "Why did we choose AWS?"
  - Attribution: "Who decided to use Node.js?"
  - Temporal: "What decisions were made in Q1 2026?"
  - Relational: "What other decisions are related to the MongoDB choice?"
- Response time < 5 seconds for 90th percentile queries

---

### FR-08: RAG Pipeline

**Priority:** Critical  
**Description:** The system shall use a Retrieval-Augmented Generation pipeline to construct accurate, grounded answers.

**Pipeline Steps:**
1. **Query Analysis** — Parse user query to identify intent and key entities
2. **Vector Retrieval** — Fetch top-5 semantically similar chunks from vector DB
3. **Graph Retrieval** — Fetch related entities from Neo4j based on identified entities
4. **Context Assembly** — Merge retrieved context into a structured prompt
5. **LLM Generation** — Pass context + query to Ollama for answer generation
6. **Source Attribution** — Append source citations to the generated answer

**Acceptance Criteria:**
- Every answer must include at least one source citation
- If no relevant context is found, the system returns: "No relevant information found for this query."
- LLM hallucination is minimized by strict system prompting: "Answer only based on the provided context."

---

### FR-09: Explainable Output

**Priority:** High  
**Description:** Every query response shall include the answer, the sources used, and the step-by-step reasoning chain.

**Response Format:**
```json
{
  "answer": "MongoDB was chosen for its horizontal scalability and flexible schema.",
  "reasoning_steps": [
    "Searched for decisions related to 'MongoDB'",
    "Found 3 relevant records from Slack #architecture and a meeting note",
    "Identified key reason: scalability requirements in Q1 2026"
  ],
  "sources": [
    {
      "type": "slack",
      "channel": "architecture",
      "date": "2026-04-01",
      "url": "https://..."
    },
    {
      "type": "google_drive",
      "title": "Architecture Meeting Notes - March 2026",
      "url": "https://..."
    }
  ],
  "confidence": 0.88
}
```

---

### FR-10: Chat Interface

**Priority:** High  
**Description:** The system shall provide a web-based chat UI for users to interact with the knowledge base.

**Acceptance Criteria:**
- Users can type natural language queries
- Responses render in a conversation thread with source cards
- Source cards are expandable to show the original context snippet
- Chat history is preserved per session (not persisted across sessions in MVP)
- Mobile-responsive layout

---

### FR-11: Document Upload (Manual Ingestion)

**Priority:** Medium  
**Description:** Users shall be able to manually upload documents (PDF, DOCX, TXT) for one-time ingestion.

**Acceptance Criteria:**
- Upload supports file types: `.pdf`, `.docx`, `.txt`, `.md`
- Maximum file size: 10 MB per file
- Uploaded document is processed through the same extraction pipeline as MCP-ingested content
- User receives confirmation once the document has been indexed

---

### FR-12: Decision Timeline View (Optional/V2)

**Priority:** Low  
**Description:** A visual timeline showing all decisions ordered by date, filterable by project, person, or tag.

---

## 5. Non-Functional Requirements

### NFR-01: Performance

| Metric | Requirement |
|--------|-------------|
| Query response time | < 5 seconds (P90) |
| Ingestion throughput | ≥ 100 messages/minute |
| Vector search latency | < 200ms |
| Graph query latency | < 500ms |
| Concurrent users | ≥ 20 simultaneous users (MVP) |

### NFR-02: Scalability

- The ingestion pipeline shall be queue-based (BullMQ / Redis) to support horizontal scaling
- Vector DB shall support at least 1 million embeddings without degradation
- Neo4j shall support at least 100,000 nodes and 500,000 relationships

### NFR-03: Reliability

- System uptime: ≥ 99% (excluding planned maintenance)
- Failed ingestion jobs shall be retried up to 3 times with exponential backoff
- All database writes shall be atomic (rollback on partial failure)

### NFR-04: Security

- All MCP credentials stored as environment variables (never hardcoded)
- API endpoints require JWT-based authentication
- Data in transit encrypted via TLS 1.2+
- Neo4j and vector DB accessible only on internal network (not publicly exposed)
- PII (email addresses, user IDs) are hashed before storage in production

### NFR-05: Maintainability

- Code coverage ≥ 70% (unit + integration tests)
- All modules follow single-responsibility principle
- API documented with OpenAPI 3.0 specification
- Docker Compose setup allows one-command local deployment

### NFR-06: Portability

- System runs on any machine with Docker (Linux, macOS, Windows WSL2)
- No cloud-provider-specific dependencies in MVP (fully self-hosted)

---

## 6. System Architecture

### 6.1 Component Breakdown

| Layer | Component | Technology | Responsibility |
|-------|-----------|------------|----------------|
| Data Sources | Slack MCP | MCP SDK | Fetch Slack messages |
| Data Sources | Gmail MCP | MCP SDK | Fetch emails |
| Data Sources | GDrive MCP | MCP SDK | Fetch documents |
| Processing | Ingestion Worker | Node.js + BullMQ | Queue and process ingested data |
| Processing | Extraction Agent | LangChain + Ollama | Extract structured decision records |
| Processing | Embedding Service | Ollama / OpenAI | Generate text embeddings |
| Storage | Vector DB | ChromaDB / Qdrant | Semantic similarity storage |
| Storage | Graph DB | Neo4j | Entity relationship storage |
| AI | RAG Pipeline | LangChain.js | Orchestrate retrieval + generation |
| AI | LLM | Ollama (llama3) | Generate final answers |
| API | REST API | Express.js | Expose query and admin endpoints |
| Frontend | Chat UI | React + Vite | User interaction interface |

### 6.2 Data Flow

```
[MCP Servers] ──► [Ingestion Queue] ──► [Extraction Agent]
                                               │
                    ┌──────────────────────────┤
                    ▼                          ▼
             [Vector DB]                  [Neo4j]
             (embeddings)              (relationships)
                    │                          │
                    └──────────┬───────────────┘
                               ▼
                      [RAG Pipeline]
                               │
                   ┌───────────┴──────────┐
                   ▼                      ▼
            [Vector Search]         [Graph Query]
                   └───────────┬──────────┘
                               ▼
                       [Context Assembly]
                               ▼
                          [Ollama LLM]
                               ▼
                     [Structured Response]
                               ▼
                        [React Frontend]
```

---

## 7. MCP Integration Specification

### 7.1 Slack MCP

| Attribute | Value |
|-----------|-------|
| Server | `@modelcontextprotocol/server-slack` |
| Config Key | `slack` |
| Auth | Slack Bot Token (OAuth) |
| Key Tools | `slack_list_channels`, `slack_get_channel_history`, `slack_get_thread_replies` |

**Config Example (`mcp_config.json`):**
```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
      }
    }
  }
}
```

### 7.2 Gmail MCP

| Attribute | Value |
|-----------|-------|
| Server | `@modelcontextprotocol/server-gmail` |
| Auth | Google OAuth2 |
| Key Tools | `gmail_list_emails`, `gmail_get_email`, `gmail_search_emails` |

### 7.3 Google Drive MCP

| Attribute | Value |
|-----------|-------|
| Server | `@modelcontextprotocol/server-gdrive` |
| Auth | Google OAuth2 (service account recommended) |
| Key Tools | `gdrive_list_files`, `gdrive_read_file`, `gdrive_search_files` |

### 7.4 Neo4j MCP

| Attribute | Value |
|-----------|-------|
| Server | `@neo4j/mcp-server` |
| Auth | Neo4j username/password |
| Key Tools | `neo4j_run_cypher` |

### 7.5 Sequential Thinking MCP

| Attribute | Value |
|-----------|-------|
| Server | `@modelcontextprotocol/server-sequential-thinking` |
| Purpose | Step-by-step reasoning extraction during knowledge processing |

---

## 8. Data Models

### 8.1 Decision Record (Core Entity)

```typescript
interface DecisionRecord {
  decision_id: string;        // UUID v4
  decision: string;           // Short statement of what was decided
  reason: string;             // Why it was decided
  alternatives?: string[];    // Other options that were considered
  people: string[];           // Email addresses of involved parties
  date: string;               // ISO 8601 date
  source: {
    type: "slack" | "gmail" | "google_drive" | "manual_upload";
    source_id: string;        // Slack message TS, email message_id, doc ID
    url?: string;
    title?: string;
  };
  tags: string[];
  confidence: number;         // 0.0 - 1.0 (extraction confidence)
  embedding_id?: string;      // Reference to vector DB entry
  created_at: string;
  updated_at: string;
}
```

### 8.2 Neo4j Graph Schema

**Nodes:**
```
(:Decision { id, text, reason, date, confidence })
(:Person   { id, email, name })
(:Project  { id, name, description })
(:Tool     { id, name, category })
(:Source   { id, type, url, title })
```

**Relationships:**
```
(:Person)-[:MADE { role: "decision_maker" | "participant" }]->(:Decision)
(:Decision)-[:PART_OF]->(:Project)
(:Decision)-[:REFERENCES]->(:Tool)
(:Decision)-[:SOURCED_FROM]->(:Source)
(:Decision)-[:RELATED_TO { similarity: float }]->(:Decision)
```

### 8.3 Vector DB Entry Schema

```json
{
  "id": "chunk-uuid",
  "embedding": [0.012, -0.034, ...],
  "document": "We decided to use MongoDB because of its flexible schema...",
  "metadata": {
    "source_type": "slack",
    "source_id": "1712001234.567890",
    "date": "2026-04-01",
    "people": ["rahul@company.com"],
    "decision_id": "uuid-of-decision",
    "chunk_index": 0,
    "total_chunks": 1
  }
}
```

---

## 9. API Specification

### POST /api/query

Execute a natural language query against the knowledge base.

**Request:**
```json
{
  "query": "Why did we choose MongoDB?",
  "filters": {
    "date_range": { "from": "2025-01-01", "to": "2026-12-31" },
    "sources": ["slack", "google_drive"],
    "people": ["rahul@company.com"]
  },
  "top_k": 5
}
```

**Response:**
```json
{
  "answer": "MongoDB was selected for its horizontal scalability...",
  "reasoning_steps": [...],
  "sources": [...],
  "confidence": 0.88,
  "query_time_ms": 2341
}
```

---

### POST /api/ingest/upload

Manually upload a document for ingestion.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "job_id": "job-uuid",
  "status": "queued",
  "message": "Document queued for processing"
}
```

---

### GET /api/decisions

List all extracted decision records with pagination.

**Query Params:** `page`, `limit`, `sort_by`, `filter_tag`, `filter_person`

---

### GET /api/decisions/:id

Retrieve a single decision record with full context.

---

### GET /api/health

System health check — returns status of all sub-components.

---

## 10. UI/UX Requirements

### 10.1 Chat Interface

- Clean single-page chat layout (similar to ChatGPT / Claude)
- Message input at the bottom with send button and keyboard shortcut (Enter)
- Typing indicator shown while the system processes the query
- Responses rendered in markdown (bold, code blocks, lists)
- Each response card has expandable "Sources" and "Reasoning" sections

### 10.2 Source Cards

Each source attached to a response should display:
- Source type icon (Slack, Gmail, Drive)
- Title or channel name
- Date
- Snippet of the original text (max 200 chars)
- "Open Source" link (if URL is available)

### 10.3 Document Upload Panel

- Drag-and-drop file upload area
- Progress bar during upload and processing
- Status indicator: Uploading → Processing → Indexed

### 10.4 Accessibility

- WCAG 2.1 AA compliance
- Keyboard-navigable interface
- Screen reader-compatible component labels

---

## 11. Security Requirements

| Requirement | Detail |
|-------------|--------|
| Authentication | JWT tokens for all API routes; Google OAuth for UI login |
| Credential storage | All secrets stored in `.env`; never committed to version control |
| Network | Neo4j and vector DB ports not exposed outside Docker network |
| Input sanitization | All user query inputs sanitized before use in Cypher queries |
| Rate limiting | API endpoints rate-limited to 60 requests/minute per user |
| Audit logging | All queries and ingestion events logged with user ID and timestamp |
| Data encryption | TLS 1.2+ for all external communications |

---

## 12. Constraints & Assumptions

### Constraints

- MVP uses Ollama with local models (llama3 / mistral) — no external LLM API calls
- Neo4j Community Edition used for MVP (no clustering support)
- ChromaDB used for development; migration path to Qdrant for production

### Assumptions

- Users have valid Slack, Gmail, and Google Drive accounts
- Node.js v20+ and Docker are available on the deployment machine
- Ollama can be run on the host machine with at least 8GB RAM for 7B parameter models
- Source data contains enough natural language to support meaningful extraction

---

## 13. Glossary

| Term | Definition |
|------|------------|
| Decision Record | A structured representation of an organizational decision including what, why, who, and when |
| Embedding | A fixed-length numeric vector representing semantic meaning of text |
| RAG | Retrieval-Augmented Generation — a technique that retrieves relevant documents before generating an answer |
| MCP | Model Context Protocol — standardized interface for connecting LLMs to tools and data sources |
| Chunk | A segment of a larger document (typically 300–500 tokens) used as the unit of embedding |
| Confidence Score | A 0–1 score indicating how certain the extraction model is about a decision record |
| Cypher | Neo4j's declarative graph query language |

---

*End of SRS Document — Version 1.0*
