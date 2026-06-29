# POLYNOUS

**A multi-agent research platform that searches, debates, and synthesizes knowledge — powered by seven specialized AI agents.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-22c55e?style=flat-square&logo=chainlink&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](mailto:pradhanashwarya2122@gmail.com)
[![Deploy](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://polynous-api-production.up.railway.app)
[![Frontend](https://img.shields.io/badge/Frontend-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://polynous.pages.dev)

[Live Demo](https://polynous.pages.dev) · [API Reference](https://polynous-api-production.up.railway.app/docs) · [Report an Issue](https://github.com/pradhanashwarya2122/POLYNOUS/issues)

---

## Overview

POLYNOUS is a production-grade research platform built on a seven-agent pipeline. Where a single model gives you one answer, POLYNOUS assembles a research team: a Search Agent queries the live web, a Summariser Agent condenses each source, a Critic Agent cross-references claims and scores confidence, and a Writer Agent synthesizes a structured, cited report.

For contested topics, a three-agent Debate Pipeline runs a formal FOR / AGAINST exchange, scored and adjudicated by an independent Judge Agent.

The platform ships with per-user knowledge graphs, semantic memory search, PDF analysis, and bring-your-own API key support — with cryptographic isolation between users at every layer.

---

## Research Pipeline

```
Search → Summariser → Critic → Writer
```

| Agent | Role |
|---|---|
| Search | Queries Tavily for real-time web sources |
| Summariser | Extracts 3–5 key insight points per source |
| Critic | Cross-references claims, assigns 0–100% confidence per finding |
| Writer | Synthesizes a structured report: Summary → Key Findings → Limitations → Confidence |

Results stream token-by-token via Server-Sent Events as each agent completes.

## Debate Pipeline

```
FOR → AGAINST → Judge
```

Each agent builds an evidence-backed case. The Judge scores both sides 1–10, provides structured reasoning, and declares a winner. Full results export as JSON.

---

## Features

**Research** — Seven-agent pipeline with live agent progress tracking. Per-claim confidence scoring rendered as an animated donut chart. Inline citations with source URLs. Response style selector: Academic / Technical / ELI5 / Casual.

**Knowledge Graph** — Interactive 2D force-directed visualization backed by Neo4j AuraDB. 70+ node types. Pathfinder finds the shortest conceptual path between any two entities. Centrality analysis highlights the most-connected nodes. Every node carries a `user_id` property; all Cypher queries filter by it.

**Semantic Search** — Meaning-based search using Pinecone + Voyage AI embeddings. Results rendered as an interactive star-map constellation. Scoped exclusively to the authenticated user's research history.

**PDF Lab** — Drag-and-drop upload with a multi-stage security pipeline: file signature check → embedded JavaScript detection → malware pattern scan. Ask questions directly against uploaded PDF content via RAG.

**Memory Bank** — Research statistics dashboard, topic interest graph, full session timeline grouped by date, and AI-generated topic suggestions derived from your past research patterns.

**Settings & Key Vault** — Bring your own Anthropic, OpenAI, or Tavily keys. Keys are encrypted at rest using Fernet (AES-128-CBC) with a key derived uniquely per user at registration. Live validation makes a real test API call before any key is stored. Masked previews in `sk-ant-****-abcd` format.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI 0.115+, Python 3.11, LangGraph 0.2+ |
| LLMs | Anthropic Claude (primary), OpenAI GPT-4o-mini (user-selectable) |
| Search | Tavily API |
| Graph DB | Neo4j AuraDB 5.x |
| Vector DB | Pinecone Serverless |
| Relational DB | PostgreSQL 15+ via SQLAlchemy 2.0 |
| Embeddings | Voyage AI / OpenAI |
| Auth | JWT (python-jose), bcrypt, Fernet encryption |
| Frontend | React 18, Vite 5, Three.js r128, React Router 6 |
| Infra | Railway (backend + PostgreSQL), Cloudflare Pages (frontend) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  React 18 · Three.js · Canvas API · Vite    │
│  polynous.pages.dev  (Cloudflare Pages)     │
└──────────────────────┬──────────────────────┘
                       │ HTTPS / SSE
┌──────────────────────▼──────────────────────┐
│  FastAPI · Python 3.11                      │
│  polynous-api-production.up.railway.app     │
│                                             │
│  Auth middleware (JWT + bcrypt)             │
│  Input sanitizer (XSS, SQLi, path traversal)│
│  Security headers (CSP, HSTS, X-Frame)     │
│                                             │
│  LangGraph Orchestrator                     │
│  ├── Research: Search → Summariser → Critic → Writer │
│  └── Debate:  FOR → AGAINST → Judge        │
│                                             │
│  BYO Key Resolver · Tavily · Claude / GPT  │
└─────────┬─────────────────┬────────────────┘
          │                 │                 
   ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
   │ PostgreSQL  │  │    Neo4j     │  │   Pinecone  │
   │ Users       │  │ Knowledge    │  │ Vector      │
   │ Sessions    │  │ graph        │  │ embeddings  │
   │ Preferences │  │ Per-user     │  │ Per-user    │
   │ Enc. keys   │  │ Cypher filter│  │ namespace   │
   └─────────────┘  └──────────────┘  └─────────────┘
```

### Request lifecycle

1. Frontend sends `POST /ask-stream` with a Bearer token
2. Auth middleware validates JWT, attaches `user_id` to request state
3. BYO key resolver decrypts the user's stored API keys (falls back to system keys)
4. LangGraph initializes `AgentState` and begins the pipeline
5. Search Agent → Tavily → sources with URLs and body text
6. Summariser Agent → Claude/GPT → key insight points per source
7. Critic Agent → Claude/GPT → cross-referenced claims with confidence score
8. Writer Agent → Claude/GPT → structured report with inline citations
9. SSE events stream to the frontend: `start → progress → tokens → end`
10. On completion: results written to Neo4j (graph), Pinecone (vectors), PostgreSQL (history)

---

## Security

| Layer | Mechanism |
|---|---|
| Passwords | bcrypt, work factor 12, unique salt per password |
| Sessions | Dual-token JWT — access tokens (15 min), refresh tokens (7 days, HttpOnly cookie, rotation on use) |
| Brute force | 5 failed attempts → 15-minute account lock |
| API key storage | Per-user Fernet key generated at registration; keys encrypted before PostgreSQL write |
| API key validation | Live test call made before any key is persisted |
| Input sanitization | Middleware strips XSS, SQL injection, shell injection, and path traversal on every request |
| CORS | Explicit origin whitelist — no wildcard |
| Security headers | `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| Neo4j isolation | Every node written with `user_id`; every read query filters `WHERE n.user_id = $user_id` |
| Pinecone isolation | Each user assigned a `user_{uuid}` namespace; all operations are namespace-scoped |
| SQL injection | 100% of queries via SQLAlchemy ORM — no raw SQL string construction |
| PDF security | Magic-byte signature check → embedded JS detection → malware signature pattern scan |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18 LTS+
- PostgreSQL 15+ (local dev only — Railway manages this in production)

### API Keys Required

| Key | Source | Free tier |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | $5 credit on signup |
| `TAVILY_API_KEY` | tavily.com | 1,000 searches/month |
| `PINECONE_API_KEY` | app.pinecone.io | 5M vectors |
| `NEO4J_URI` + credentials | console.neo4j.io | 1 free AuraDB instance |
| `OPENAI_API_KEY` | platform.openai.com | Optional — fallback LLM |
| `VOYAGE_API_KEY` | dash.voyageai.com | Optional — embeddings |

### Installation

```bash
git clone https://github.com/pradhanashwarya2122/POLYNOUS.git
cd POLYNOUS
```

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your API keys
uvicorn app.main:app --reload --port 8000
```

Backend: `http://localhost:8000` · Docs: `http://localhost:8000/docs`

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5174`

**Docker (full stack)**

```bash
docker-compose up --build
```

### Environment Variables

```env
# LLMs
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...                    # Optional

# Search
TAVILY_API_KEY=tvly-...

# Embeddings
VOYAGE_API_KEY=vo-...                    # Optional

# Vector DB
PINECONE_API_KEY=pcsk-...
PINECONE_ENVIRONMENT=gcp-starter

# Graph DB
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-aura-password

# Auth
JWT_SECRET=                              # openssl rand -hex 32
ENCRYPTION_KEY=                          # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/polynous

# CORS
FRONTEND_URL=http://localhost:5174

ENVIRONMENT=development
```

### Common Issues

| Error | Fix |
|---|---|
| `ModuleNotFoundError: magic` on Windows | `pip install python-magic-bin` |
| `Neo4j connection refused` | URI must start with `neo4j+s://`, not `bolt://` |
| `Pinecone index not found` | Index auto-creates on first use — wait 5–10 seconds |
| `CORS error in browser` | `FRONTEND_URL` must exactly match the frontend URL including port |
| `401 Unauthorized` on all routes | Access tokens expire after 15 min — log in again |

---

## API Reference

### Authentication

| Method | Endpoint | Auth |
|---|---|---|
| `POST` | `/auth/register` | — |
| `POST` | `/auth/login` | — |
| `POST` | `/auth/refresh` | Refresh cookie |
| `GET` | `/auth/me` | Bearer |
| `PUT` | `/auth/change-password` | Bearer |
| `POST` | `/auth/revoke-sessions` | Bearer |
| `GET` | `/oauth/google` | — |
| `GET` | `/oauth/github` | — |

### Research & Debate

```
POST /ask          Full pipeline, returns JSON on completion
POST /ask-stream   Pipeline with SSE streaming
```

Request body:
```json
{
  "query": "How does CRISPR gene editing work?",
  "debate_mode": false,
  "response_style": "academic"
}
```

SSE event stream:
```
data: {"type": "start"}
data: {"type": "progress", "agent": "Search", "message": "Searching web..."}
data: {"type": "token", "content": "CRISPR (Clustered Regularly..."}
data: {"type": "confidence", "score": 87}
data: {"type": "end"}
```

### Memory, Search & Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/memory/stats` | Research statistics |
| `GET` | `/memory/history` | Full session timeline |
| `GET` | `/memory/debates` | Debate history |
| `GET` | `/knowledge/graph` | Full user knowledge graph |
| `GET` | `/knowledge/connections` | Shortest path between two entities |
| `GET` | `/search?q={query}` | Semantic search over research history |
| `PUT` | `/settings/api-keys` | Save an API key (encrypted before storage) |
| `POST` | `/settings/api-keys/test` | Validate a key via live test call |
| `GET` | `/settings/export` | Export all user data as JSON |
| `POST` | `/settings/reset` | Full account data reset |

Full API docs: [polynous-api-production.up.railway.app/docs](https://polynous-api-production.up.railway.app/docs)

---

## Project Structure

```
POLYNOUS/
├── backend/
│   └── app/
│       ├── main.py                   FastAPI entrypoint
│       ├── database.py               SQLAlchemy engine and session factory
│       ├── llm_client.py             Multi-provider abstraction (Claude / GPT)
│       ├── state.py                  AgentState TypedDict shared across pipeline
│       ├── agents/
│       │   ├── summariser_agent.py
│       │   ├── critic_agent.py
│       │   ├── writer_agent.py
│       │   └── debate_agents.py      FOR, AGAINST, Judge agents
│       ├── graph/
│       │   ├── orchestrator.py       Research pipeline StateGraph
│       │   └── debate_graph.py       Debate pipeline StateGraph
│       ├── knowledge_graph/
│       │   ├── graph_manager.py      Neo4j CRUD, pathfinder, centrality
│       │   ├── user_memory.py        User-scoped memory in Neo4j
│       │   └── hybrid_search.py      Vector + graph combined search
│       ├── memory/
│       │   └── vector_store.py       Pinecone namespace operations
│       ├── routes/                   FastAPI route handlers
│       ├── middleware/               Auth, input sanitizer, security headers
│       ├── models/user.py            SQLAlchemy ORM models
│       └── utils/                    Encryption, sanitizer, PDF security, key resolver
└── frontend/
    └── src/
        └── components/
            ├── ResearchInterface.jsx
            ├── DebateInterface.jsx
            ├── KnowledgeGraphPage.jsx
            ├── SemanticSearchPage.jsx
            ├── MemoryBank.jsx
            ├── SettingsPage.jsx
            ├── PdfLabPage.jsx
            └── AuthPage.jsx
```

---

## Deployment

**Backend → Railway**

Push to GitHub. In Railway: New Project → Deploy from GitHub → set root directory to `/backend` → add environment variables. Railway auto-detects the Dockerfile and manages PostgreSQL. Re-deploys on every push to `main`.

**Frontend → Cloudflare Pages**

Connect your repository. Build command: `npm run build`. Output directory: `dist`. Root directory: `frontend`. Add `VITE_API_URL` pointing to your Railway backend URL. Re-deploys on every push to `main`.

---

## Testing

```bash
cd backend && source venv/bin/activate

python test_auth.py             # Auth flow and brute force lockout
python test_multi_user.py       # Multi-user registration and UUID collision checks
python test_data_isolation.py   # Confirms User A cannot access User B's data
python test_settings_endpoints.py
python test_byo_keys.py         # BYO key lifecycle: save, retrieve, validate, delete
python check_dependencies.py    # CVE scan against Python dependencies
```

---

## Roadmap

```
Done
  ✓  Seven-agent research pipeline with SSE streaming
  ✓  Debate mode — FOR / AGAINST / Judge
  ✓  Per-user Neo4j knowledge graph with pathfinder
  ✓  Pinecone semantic memory with constellation UI
  ✓  PDF Lab with security validation and RAG
  ✓  BYO API keys with Fernet encryption and live validation
  ✓  Google + GitHub OAuth 2.0
  ✓  Brute force protection and account lockout
  ✓  Full data export and account reset
  ✓  Railway + Cloudflare Pages deployment
  ✓  Neural Analytics — research intelligence dashboard with activity heatmap,
       confidence distribution, topic mapping, and session trend visualization

In progress
  –  Multi-PDF cross-referencing
  –  Knowledge graph timeline playback

Planned
  –  Team workspaces — shared knowledge graphs across users
  –  Scheduled research — recurring queries on a cron
  –  Citation verification — auto-check if sources are still live
  –  Browser extension
  –  Self-hosted LLM support via Ollama
  –  Webhook integrations — push results to Slack / Notion
```

---

## License

Copyright © 2024–2025 Ashwarya Pradhan. All rights reserved.

This repository is source-available. Viewing the code does not grant any rights to use, copy, modify, deploy, or build upon it. Unauthorized reproduction or deployment — in any form — is subject to applicable copyright law.

For licensing inquiries or commercial use: [pradhanashwarya2122@gmail.com](mailto:pradhanashwarya2122@gmail.com)