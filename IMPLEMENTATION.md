# Implementation Guide
# Organizational Memory & Reasoning Engine

**Version:** 1.0  
**Date:** April 2026  
**Estimated Build Time:** 5 Days (Solo Developer)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Day 1 — Environment Setup & MCP Configuration](#3-day-1--environment-setup--mcp-configuration)
4. [Day 2 — Ingestion Pipeline](#4-day-2--ingestion-pipeline)
5. [Day 3 — Graph Database Setup (Neo4j)](#5-day-3--graph-database-setup-neo4j)
6. [Day 4 — RAG Pipeline](#6-day-4--rag-pipeline)
7. [Day 5 — Frontend Chat UI](#7-day-5--frontend-chat-ui)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Docker Setup](#9-docker-setup)
10. [Testing](#10-testing)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### 1.1 Software Requirements

| Software | Version | Install Command |
|----------|---------|----------------|
| Node.js | v20+ | [nodejs.org](https://nodejs.org) |
| npm | v10+ | Bundled with Node.js |
| Docker | v24+ | [docker.com](https://docker.com) |
| Docker Compose | v2.20+ | Bundled with Docker Desktop |
| Ollama | Latest | `curl -fsSL https://ollama.ai/install.sh \| sh` |
| Git | v2.40+ | System package manager |

### 1.2 Hardware Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 8 GB | 16 GB |
| Storage | 20 GB free | 50 GB free |
| CPU | 4 cores | 8 cores |
| GPU | None (CPU inference) | NVIDIA GPU for faster LLM |

### 1.3 Accounts / Credentials Needed

- Slack workspace with Bot Token (`xoxb-...`)
- Google Cloud project with OAuth2 credentials (for Gmail + Drive MCPs)
- Neo4j Desktop or Docker image (Community Edition is free)

### 1.4 Pull Ollama Models

```bash
# Install Ollama first, then pull these models:

# Primary LLM for generation
ollama pull llama3

# Embedding model
ollama pull nomic-embed-text

# Alternative smaller LLM (if RAM is limited)
ollama pull mistral
```

---

## 2. Project Structure

```
org-memory-engine/
│
├── backend/
│   ├── agents/
│   │   ├── extractionAgent.js       # LLM-based decision extractor
│   │   └── reasoningAgent.js        # Sequential thinking reasoner
│   │
│   ├── ingestion/
│   │   ├── slackIngestion.js        # Slack MCP data fetcher
│   │   ├── gmailIngestion.js        # Gmail MCP data fetcher
│   │   ├── gdriveIngestion.js       # Google Drive MCP data fetcher
│   │   ├── fileIngestion.js         # Manual file upload handler
│   │   ├── chunker.js               # Text chunking utility
│   │   └── ingestionQueue.js        # BullMQ job queue manager
│   │
│   ├── rag/
│   │   ├── pipeline.js              # Main RAG orchestrator
│   │   ├── retriever.js             # Vector + graph retrieval
│   │   ├── contextAssembler.js      # Merges retrieved context
│   │   └── responseFormatter.js     # Formats final response with sources
│   │
│   ├── db/
│   │   ├── vectorDb.js              # ChromaDB / Qdrant client
│   │   ├── graphDb.js               # Neo4j client + Cypher helpers
│   │   └── schema.js                # Neo4j constraint setup script
│   │
│   ├── routes/
│   │   ├── query.js                 # POST /api/query
│   │   ├── ingest.js                # POST /api/ingest/upload
│   │   └── decisions.js             # GET /api/decisions
│   │
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   └── rateLimiter.js           # Rate limiting
│   │
│   └── server.js                    # Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx       # Main chat conversation view
│   │   │   ├── MessageBubble.jsx    # Individual message component
│   │   │   ├── SourceCard.jsx       # Expandable source citation card
│   │   │   ├── ReasoningPanel.jsx   # Collapsible reasoning steps
│   │   │   └── UploadPanel.jsx      # File upload drag-and-drop
│   │   │
│   │   ├── pages/
│   │   │   ├── Chat.jsx             # Main chat page
│   │   │   └── Decisions.jsx        # Decision browser page
│   │   │
│   │   ├── api/
│   │   │   └── client.js            # Axios API client
│   │   │
│   │   └── App.jsx
│   │
│   ├── index.html
│   └── vite.config.js
│
├── mcp_config.json                  # MCP server definitions
├── docker-compose.yml               # Full stack orchestration
├── .env.example                     # Template for environment variables
├── .env                             # Actual secrets (gitignored)
├── package.json
└── README.md
```

---

## 3. Day 1 — Environment Setup & MCP Configuration

### 3.1 Initialize the Project

```bash
mkdir org-memory-engine && cd org-memory-engine
npm init -y

# Backend dependencies
npm install express langchain @langchain/community @langchain/ollama \
  chromadb neo4j-driver bullmq redis uuid dotenv multer \
  @modelcontextprotocol/sdk cors helmet express-rate-limit jsonwebtoken

# Dev dependencies
npm install -D nodemon jest supertest

# Frontend (separate workspace)
cd frontend
npm create vite@latest . -- --template react
npm install axios react-markdown lucide-react
```

### 3.2 Configure MCP Servers

Create `mcp_config.json` in the project root:

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
    },
    "gmail": {
      "command": "npx",
      "args": ["-y", "@gongrzhe/server-gmail-autoauth-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
        "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
        "GOOGLE_REFRESH_TOKEN": "${GOOGLE_REFRESH_TOKEN}"
      }
    },
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"],
      "env": {
        "GDRIVE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
        "GDRIVE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
        "GDRIVE_REFRESH_TOKEN": "${GOOGLE_REFRESH_TOKEN}"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "neo4j": {
      "command": "npx",
      "args": ["-y", "@neo4j/mcp-server"],
      "env": {
        "NEO4J_URI": "${NEO4J_URI}",
        "NEO4J_USERNAME": "${NEO4J_USERNAME}",
        "NEO4J_PASSWORD": "${NEO4J_PASSWORD}"
      }
    }
  }
}
```

### 3.3 MCP Client Initialization

Create `backend/mcpClient.js`:

```javascript
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('fs');
const path = require('path');

// Load and substitute env vars in mcp_config.json
function loadMcpConfig() {
  const raw = fs.readFileSync(path.join(__dirname, '../mcp_config.json'), 'utf8');
  return JSON.parse(raw.replace(/\${(\w+)}/g, (_, key) => process.env[key] || ''));
}

const mcpClients = {};

async function getMcpClient(serverName) {
  if (mcpClients[serverName]) return mcpClients[serverName];

  const config = loadMcpConfig();
  const serverConfig = config.mcpServers[serverName];
  if (!serverConfig) throw new Error(`No MCP config for: ${serverName}`);

  const transport = new StdioClientTransport({
    command: serverConfig.command,
    args: serverConfig.args,
    env: { ...process.env, ...serverConfig.env }
  });

  const client = new Client({ name: 'org-memory-engine', version: '1.0.0' }, {
    capabilities: { tools: {} }
  });

  await client.connect(transport);
  mcpClients[serverName] = client;
  return client;
}

module.exports = { getMcpClient };
```

### 3.4 Express Server Bootstrap

Create `backend/server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { setupNeo4jSchema } = require('./db/schema');

const queryRoutes    = require('./routes/query');
const ingestRoutes   = require('./routes/ingest');
const decisionsRoutes = require('./routes/decisions');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/query',     queryRoutes);
app.use('/api/ingest',    ingestRoutes);
app.use('/api/decisions', decisionsRoutes);

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

async function start() {
  await setupNeo4jSchema();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch(console.error);
```

---

## 4. Day 2 — Ingestion Pipeline

### 4.1 Text Chunker Utility

Create `backend/ingestion/chunker.js`:

```javascript
/**
 * Splits text into overlapping chunks for embedding.
 * @param {string} text - Input text
 * @param {number} chunkSize - Target tokens per chunk (~4 chars per token)
 * @param {number} overlap - Overlap in characters between chunks
 */
function chunkText(text, chunkSize = 2000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({
      text: text.slice(start, end),
      chunk_index: chunks.length,
      start_char: start,
      end_char: end
    });
    start += chunkSize - overlap;
  }

  return chunks;
}

module.exports = { chunkText };
```

### 4.2 Slack Ingestion

Create `backend/ingestion/slackIngestion.js`:

```javascript
const { getMcpClient } = require('../mcpClient');

async function fetchSlackMessages(channels = [], since = null) {
  const client = await getMcpClient('slack');
  const results = [];

  // Get list of channels if not provided
  if (channels.length === 0) {
    const response = await client.callTool({
      name: 'slack_list_channels',
      arguments: { limit: 100 }
    });
    channels = JSON.parse(response.content[0].text)
      .channels.map(c => c.id);
  }

  for (const channelId of channels) {
    const args = { channel_id: channelId, limit: 100 };
    if (since) args.oldest = since;

    const response = await client.callTool({
      name: 'slack_get_channel_history',
      arguments: args
    });

    const data = JSON.parse(response.content[0].text);
    const messages = data.messages || [];

    for (const msg of messages) {
      if (!msg.text || msg.subtype) continue; // Skip bot messages and system events

      results.push({
        source: 'slack',
        source_id: msg.ts,
        channel: channelId,
        text: msg.text,
        user: msg.user,
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        thread_ts: msg.thread_ts || null,
        url: `https://slack.com/archives/${channelId}/p${msg.ts.replace('.', '')}`
      });
    }
  }

  return results;
}

module.exports = { fetchSlackMessages };
```

### 4.3 Knowledge Extraction Agent

Create `backend/agents/extractionAgent.js`:

```javascript
const { Ollama } = require('@langchain/ollama');

const llm = new Ollama({
  model: process.env.OLLAMA_MODEL || 'llama3',
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
});

const EXTRACTION_PROMPT = `You are an expert at analyzing organizational communication to extract decisions.

Given the following text, determine if it contains an organizational decision.
If yes, extract the decision details. If no decision is present, return null.

Respond ONLY with valid JSON. No explanation, no markdown, no backticks.

If decision found:
{
  "found": true,
  "decision": "<short statement of what was decided>",
  "reason": "<why this was decided>",
  "alternatives": ["<other options considered>"],
  "people": ["<email or name of person who made/participated in decision>"],
  "date": "<ISO date if mentioned, else null>",
  "tags": ["<relevant keywords like: database, infrastructure, frontend, etc>"],
  "confidence": <0.0 to 1.0>
}

If no decision:
{ "found": false }

TEXT TO ANALYZE:
{text}`;

async function extractDecision(text, metadata = {}) {
  try {
    const prompt = EXTRACTION_PROMPT.replace('{text}', text.slice(0, 2000));
    const response = await llm.invoke(prompt);

    // Clean and parse JSON
    const clean = response.trim().replace(/```json|```/g, '');
    const parsed = JSON.parse(clean);

    if (!parsed.found || parsed.confidence < 0.7) return null;

    return {
      ...parsed,
      date: parsed.date || metadata.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
      source: metadata
    };
  } catch (err) {
    console.error('Extraction failed:', err.message);
    return null;
  }
}

module.exports = { extractDecision };
```

### 4.4 Vector Database Client

Create `backend/db/vectorDb.js`:

```javascript
const { ChromaClient } = require('chromadb');
const { Ollama } = require('@langchain/ollama');
const { OllamaEmbeddings } = require('@langchain/ollama');
const { v4: uuidv4 } = require('uuid');

const chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

const embeddings = new OllamaEmbeddings({
  model: 'nomic-embed-text',
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
});

let collection;

async function getCollection() {
  if (collection) return collection;
  collection = await chroma.getOrCreateCollection({
    name: 'org_memory',
    metadata: { 'hnsw:space': 'cosine' }
  });
  return collection;
}

async function storeChunks(chunks, metadata) {
  const col = await getCollection();
  const ids = [];
  const docs = [];
  const metas = [];
  const embeds = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embeddings.embedQuery(chunk.text);
    ids.push(uuidv4());
    docs.push(chunk.text);
    embeds.push(embedding);
    metas.push({
      ...metadata,
      chunk_index: i,
      total_chunks: chunks.length
    });
  }

  await col.add({ ids, documents: docs, embeddings: embeds, metadatas: metas });
  return ids;
}

async function semanticSearch(query, topK = 5) {
  const col = await getCollection();
  const queryEmbedding = await embeddings.embedQuery(query);

  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ['documents', 'metadatas', 'distances']
  });

  return results.documents[0].map((doc, i) => ({
    text: doc,
    metadata: results.metadatas[0][i],
    score: 1 - results.distances[0][i]  // Convert distance to similarity
  })).filter(r => r.score > 0.5);
}

module.exports = { storeChunks, semanticSearch };
```

### 4.5 Ingestion Queue with BullMQ

Create `backend/ingestion/ingestionQueue.js`:

```javascript
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { chunkText } = require('./chunker');
const { extractDecision } = require('../agents/extractionAgent');
const { storeChunks } = require('../db/vectorDb');
const { createDecisionNode } = require('../db/graphDb');
const { v4: uuidv4 } = require('uuid');

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ingestionQueue = new Queue('ingestion', { connection });

const worker = new Worker('ingestion', async (job) => {
  const { items, source_type } = job.data;
  console.log(`Processing ${items.length} items from ${source_type}`);

  for (const item of items) {
    const chunks = chunkText(item.text);
    const metadata = {
      source_type,
      source_id: item.source_id,
      date: item.timestamp?.split('T')[0],
      people: item.user ? [item.user] : [],
      url: item.url || null
    };

    // Store all chunks in vector DB
    const embeddingIds = await storeChunks(chunks, metadata);

    // Try to extract a decision record
    const decision = await extractDecision(item.text, { ...metadata, timestamp: item.timestamp });

    if (decision) {
      const decisionId = uuidv4();
      await createDecisionNode({
        ...decision,
        decision_id: decisionId,
        embedding_id: embeddingIds[0]
      });
      console.log(`Decision extracted: "${decision.decision.slice(0, 60)}..."`);
    }
  }
}, { connection, concurrency: 3 });

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

async function enqueueIngestion(items, source_type) {
  await ingestionQueue.add(`ingest-${source_type}`, { items, source_type }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
}

module.exports = { enqueueIngestion };
```

---

## 5. Day 3 — Graph Database Setup (Neo4j)

### 5.1 Start Neo4j with Docker

Add to `docker-compose.yml` (see Section 9 for full file):

```yaml
neo4j:
  image: neo4j:5
  ports:
    - "7474:7474"   # Browser UI
    - "7687:7687"   # Bolt protocol
  environment:
    NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
  volumes:
    - neo4j_data:/data
```

### 5.2 Schema & Constraints Setup

Create `backend/db/schema.js`:

```javascript
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

async function setupNeo4jSchema() {
  const session = driver.session();
  try {
    const constraints = [
      'CREATE CONSTRAINT IF NOT EXISTS FOR (d:Decision) REQUIRE d.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.email IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (pr:Project) REQUIRE pr.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (t:Tool) REQUIRE t.name IS UNIQUE',
    ];
    for (const cypher of constraints) {
      await session.run(cypher);
    }
    console.log('Neo4j schema initialized');
  } finally {
    await session.close();
  }
}

module.exports = { driver, setupNeo4jSchema };
```

### 5.3 Graph Database Operations

Create `backend/db/graphDb.js`:

```javascript
const { driver } = require('./schema');
const { v4: uuidv4 } = require('uuid');

async function createDecisionNode(decision) {
  const session = driver.session();
  try {
    // Create Decision node
    await session.run(`
      MERGE (d:Decision { id: $id })
      SET d.text = $decision,
          d.reason = $reason,
          d.date = $date,
          d.confidence = $confidence,
          d.source_type = $source_type,
          d.source_url = $source_url,
          d.created_at = datetime()
    `, {
      id: decision.decision_id,
      decision: decision.decision,
      reason: decision.reason,
      date: decision.date,
      confidence: decision.confidence,
      source_type: decision.source?.type || 'unknown',
      source_url: decision.source?.url || null
    });

    // Create Person nodes and relationships
    for (const person of (decision.people || [])) {
      await session.run(`
        MERGE (p:Person { email: $email })
        WITH p
        MATCH (d:Decision { id: $decisionId })
        MERGE (p)-[:MADE]->(d)
      `, { email: person, decisionId: decision.decision_id });
    }

    // Create Tool nodes from tags
    for (const tag of (decision.tags || [])) {
      await session.run(`
        MERGE (t:Tool { name: $name })
        WITH t
        MATCH (d:Decision { id: $decisionId })
        MERGE (d)-[:REFERENCES]->(t)
      `, { name: tag, decisionId: decision.decision_id });
    }

  } finally {
    await session.close();
  }
}

async function queryRelatedEntities(query) {
  const session = driver.session();
  try {
    // Full-text search on decision text
    const result = await session.run(`
      MATCH (d:Decision)
      WHERE toLower(d.text) CONTAINS toLower($query)
         OR toLower(d.reason) CONTAINS toLower($query)
      OPTIONAL MATCH (p:Person)-[:MADE]->(d)
      OPTIONAL MATCH (d)-[:REFERENCES]->(t:Tool)
      RETURN d, collect(DISTINCT p.email) AS people, collect(DISTINCT t.name) AS tools
      ORDER BY d.date DESC
      LIMIT 10
    `, { query });

    return result.records.map(r => ({
      decision: r.get('d').properties,
      people: r.get('people'),
      tools: r.get('tools')
    }));
  } finally {
    await session.close();
  }
}

module.exports = { createDecisionNode, queryRelatedEntities };
```

---

## 6. Day 4 — RAG Pipeline

### 6.1 Context Assembler

Create `backend/rag/contextAssembler.js`:

```javascript
function assembleContext(vectorResults, graphResults) {
  const parts = [];

  if (vectorResults.length > 0) {
    parts.push('=== RELEVANT DOCUMENTS ===');
    vectorResults.forEach((r, i) => {
      parts.push(`[${i + 1}] Source: ${r.metadata.source_type} | Date: ${r.metadata.date}`);
      parts.push(r.text.slice(0, 500));
      parts.push('');
    });
  }

  if (graphResults.length > 0) {
    parts.push('=== RELATED DECISIONS (from knowledge graph) ===');
    graphResults.forEach((r, i) => {
      parts.push(`[D${i + 1}] Decision: ${r.decision.text}`);
      parts.push(`     Reason: ${r.decision.reason}`);
      if (r.people.length > 0) parts.push(`     People: ${r.people.join(', ')}`);
      if (r.tools.length > 0)  parts.push(`     Related to: ${r.tools.join(', ')}`);
      parts.push('');
    });
  }

  return parts.join('\n');
}

module.exports = { assembleContext };
```

### 6.2 RAG Pipeline Orchestrator

Create `backend/rag/pipeline.js`:

```javascript
const { Ollama } = require('@langchain/ollama');
const { semanticSearch } = require('../db/vectorDb');
const { queryRelatedEntities } = require('../db/graphDb');
const { assembleContext } = require('./contextAssembler');

const llm = new Ollama({
  model: process.env.OLLAMA_MODEL || 'llama3',
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
});

const SYSTEM_PROMPT = `You are an Organizational Memory Assistant. 
Your job is to answer questions about organizational decisions based ONLY on the provided context.

Rules:
1. Only use information from the provided context to answer
2. If the context doesn't contain relevant information, say: "I don't have enough information to answer this."
3. Always be specific and cite which source your answer comes from
4. Be concise and clear

Context:
{context}`;

async function runQuery(userQuery, filters = {}) {
  const startTime = Date.now();

  // Step 1: Parallel retrieval from vector DB and graph DB
  const [vectorResults, graphResults] = await Promise.all([
    semanticSearch(userQuery, filters.top_k || 5),
    queryRelatedEntities(userQuery)
  ]);

  if (vectorResults.length === 0 && graphResults.length === 0) {
    return {
      answer: "I don't have any relevant information about this topic in the knowledge base.",
      sources: [],
      reasoning_steps: ['No relevant documents found in vector DB', 'No matching decisions in knowledge graph'],
      confidence: 0,
      query_time_ms: Date.now() - startTime
    };
  }

  // Step 2: Assemble context
  const context = assembleContext(vectorResults, graphResults);

  // Step 3: Build prompt
  const prompt = SYSTEM_PROMPT.replace('{context}', context) +
    `\n\nQuestion: ${userQuery}\n\nAnswer:`;

  // Step 4: Generate answer
  const answer = await llm.invoke(prompt);

  // Step 5: Format sources
  const sources = [
    ...vectorResults.map(r => ({
      type: r.metadata.source_type,
      source_id: r.metadata.source_id,
      date: r.metadata.date,
      url: r.metadata.url || null,
      snippet: r.text.slice(0, 200)
    })),
    ...graphResults.map(r => ({
      type: 'knowledge_graph',
      decision: r.decision.text,
      date: r.decision.date,
      people: r.people
    }))
  ];

  const reasoning_steps = [
    `Searched vector database, found ${vectorResults.length} relevant chunks`,
    `Queried knowledge graph, found ${graphResults.length} related decisions`,
    `Assembled ${context.length} characters of context`,
    `Generated answer using ${process.env.OLLAMA_MODEL || 'llama3'}`
  ];

  return {
    answer: answer.trim(),
    sources,
    reasoning_steps,
    confidence: vectorResults.length > 0 ? vectorResults[0].score : 0.5,
    query_time_ms: Date.now() - startTime
  };
}

module.exports = { runQuery };
```

### 6.3 Query Route

Create `backend/routes/query.js`:

```javascript
const express = require('express');
const { runQuery } = require('../rag/pipeline');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { query, filters } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await runQuery(query.trim(), filters || {});
    res.json(result);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

---

## 7. Day 5 — Frontend Chat UI

### 7.1 API Client

Create `frontend/src/api/client.js`:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000
});

export async function sendQuery(query, filters = {}) {
  const { data } = await api.post('/query', { query, filters });
  return data;
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/ingest/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function getDecisions(params = {}) {
  const { data } = await api.get('/decisions', { params });
  return data;
}
```

### 7.2 Main Chat Component

Create `frontend/src/components/ChatWindow.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import { sendQuery } from '../api/client';
import MessageBubble from './MessageBubble';
import { Send, Loader2 } from 'lucide-react';

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Organizational Memory Assistant. Ask me anything about past decisions, why things were built a certain way, or who made a particular choice.',
      sources: [],
      reasoning_steps: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendQuery(userMessage.content);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        sources: result.sources || [],
        reasoning_steps: result.reasoning_steps || [],
        confidence: result.confidence,
        query_time_ms: result.query_time_ms
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        sources: [],
        reasoning_steps: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">🧠 Org Memory Engine</h1>
        <p className="text-sm text-gray-500">Ask questions about organizational decisions and history</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 pl-2">
            <Loader2 className="animate-spin w-4 h-4" />
            <span className="text-sm">Searching knowledge base...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a decision, e.g. 'Why did we choose MongoDB?'"
            rows={2}
            className="flex-1 resize-none border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl px-5 py-3 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
```

### 7.3 Message Bubble with Source Cards

Create `frontend/src/components/MessageBubble.jsx`:

```jsx
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, ExternalLink, MessageSquare, Mail, FileText } from 'lucide-react';

const sourceIcons = {
  slack: <MessageSquare className="w-3 h-3" />,
  gmail: <Mail className="w-3 h-3" />,
  google_drive: <FileText className="w-3 h-3" />,
  knowledge_graph: <span>🔗</span>
};

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl w-full ${isUser ? 'ml-12' : 'mr-12'}`}>
        <div className={`rounded-2xl px-5 py-4 shadow-sm ${
          isUser ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800'
        }`}>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Sources Toggle */}
        {!isUser && message.sources?.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
            >
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
            </button>

            {showSources && (
              <div className="mt-2 space-y-2">
                {message.sources.map((src, i) => (
                  <div key={i} className="bg-gray-50 border rounded-lg px-3 py-2 text-xs">
                    <div className="flex items-center gap-1 font-medium text-gray-600 mb-1">
                      {sourceIcons[src.type] || '📄'}
                      <span className="capitalize">{src.type?.replace('_', ' ')}</span>
                      {src.date && <span className="text-gray-400">· {src.date}</span>}
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="ml-auto">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {src.snippet && <p className="text-gray-500 line-clamp-2">{src.snippet}</p>}
                    {src.decision && <p className="text-gray-600">📋 {src.decision}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reasoning Toggle */}
        {!isUser && message.reasoning_steps?.length > 0 && (
          <div className="mt-1">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              View reasoning
            </button>
            {showReasoning && (
              <ol className="mt-2 space-y-1 pl-3 border-l-2 border-gray-200">
                {message.reasoning_steps.map((step, i) => (
                  <li key={i} className="text-xs text-gray-500">{i + 1}. {step}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {!isUser && message.query_time_ms && (
          <p className="text-xs text-gray-300 mt-1">{(message.query_time_ms / 1000).toFixed(1)}s</p>
        )}
      </div>
    </div>
  );
}
```

---

## 8. Environment Variables Reference

Create `.env.example`:

```bash
# ─── Server ──────────────────────────────────────────
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# ─── LLM (Ollama) ────────────────────────────────────
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
EMBEDDING_MODEL=nomic-embed-text

# ─── Vector DB (ChromaDB) ────────────────────────────
CHROMA_URL=http://localhost:8000

# ─── Graph DB (Neo4j) ────────────────────────────────
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password_here

# ─── Queue (Redis / BullMQ) ──────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Slack MCP ───────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_TEAM_ID=T0123456789

# ─── Google (Gmail + Drive MCP) ──────────────────────
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# ─── Auth ─────────────────────────────────────────────
JWT_SECRET=your-long-random-secret-string
```

---

## 9. Docker Setup

Create `docker-compose.yml`:

```yaml
version: '3.9'

services:
  # ─── Databases ──────────────────────────────────────
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      ANONYMIZED_TELEMETRY: "false"

  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"   # Browser UI
      - "7687:7687"   # Bolt
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - neo4j_data:/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # ─── Application ────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    env_file: .env
    depends_on:
      - chromadb
      - neo4j
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    env_file: .env
    depends_on:
      - backend

volumes:
  chroma_data:
  neo4j_data:
  redis_data:
```

**Start everything:**

```bash
# Copy env file
cp .env.example .env
# Fill in your credentials in .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

---

## 10. Testing

### 10.1 Test Ingestion with Dummy Data

Create `backend/scripts/testIngest.js`:

```javascript
require('dotenv').config();
const { enqueueIngestion } = require('../ingestion/ingestionQueue');

const dummyItems = [
  {
    source_id: 'test-001',
    text: 'After evaluating PostgreSQL, MySQL, and MongoDB, we decided to go with MongoDB. The main reason was its flexible document schema which fits our product catalog use case. Decision made by Rahul and Priya in the architecture review meeting.',
    user: 'rahul@company.com',
    timestamp: '2026-03-15T09:00:00Z',
    url: 'https://example.com/slack/msg/001'
  },
  {
    source_id: 'test-002',
    text: 'We are moving our infrastructure to AWS. The primary driver is high availability and the managed services (RDS, S3, CloudFront) will reduce our operational burden. Approved by the CTO.',
    user: 'priya@company.com',
    timestamp: '2026-03-20T14:30:00Z',
    url: 'https://example.com/slack/msg/002'
  }
];

enqueueIngestion(dummyItems, 'slack')
  .then(() => console.log('Dummy data enqueued successfully'))
  .catch(console.error);
```

```bash
node backend/scripts/testIngest.js
```

### 10.2 Test Query

```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Why did we choose MongoDB?"}'
```

**Expected output:**
```json
{
  "answer": "MongoDB was chosen because of its flexible document schema...",
  "sources": [...],
  "reasoning_steps": [...],
  "confidence": 0.89,
  "query_time_ms": 2341
}
```

### 10.3 Unit Tests

```bash
npm test
```

Test file `backend/__tests__/chunker.test.js`:

```javascript
const { chunkText } = require('../ingestion/chunker');

test('chunks long text correctly', () => {
  const text = 'A'.repeat(5000);
  const chunks = chunkText(text, 2000, 200);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks[0].text.length).toBeLessThanOrEqual(2000);
});

test('handles short text as single chunk', () => {
  const chunks = chunkText('Short text', 2000, 200);
  expect(chunks.length).toBe(1);
});
```

---

## 11. Troubleshooting

| Problem | Solution |
|---------|----------|
| Ollama not responding | Ensure Ollama is running: `ollama serve` |
| ChromaDB connection refused | Start with Docker: `docker-compose up chromadb` |
| Neo4j auth failure | Check `NEO4J_PASSWORD` in `.env` matches Docker env var |
| Redis connection refused | Start with Docker: `docker-compose up redis` |
| MCP server fails to start | Check all required env vars are set in `.env` |
| LLM produces malformed JSON | Retry extraction; reduce context length in extraction prompt |
| Slow query response | Switch Ollama model to `mistral` for faster inference |
| Embeddings not found | Verify `nomic-embed-text` was pulled: `ollama list` |

### Quick Health Check

```bash
# Check all services are running
docker-compose ps

# Test Ollama
curl http://localhost:11434/api/tags

# Test ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Test Neo4j
curl http://localhost:7474

# Test backend
curl http://localhost:3001/api/health
```

---

*End of Implementation Guide — Version 1.0*
