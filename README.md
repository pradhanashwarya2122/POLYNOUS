```
        ✦               ✧                    ✦          ✧              ✦
   ✧         ██████╗  ██████╗ ██╗  ██╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗        ✦
        ✦    ██╔══██╗██╔═══██╗██║  ╚██╗ ██╔╝████╗  ██║██╔═══██╗██║   ██║██╔════╝   ✧
   ✦         ██████╔╝██║   ██║██║   ╚████╔╝ ██╔██╗ ██║██║   ██║██║   ██║███████╗        ✦
        ✧    ██╔═══╝ ██║   ██║██║    ╚██╔╝  ██║╚██╗██║██║   ██║██║   ██║╚════██║   ✦
   ✦         ██║     ╚██████╔╝███████╗██║   ██║ ╚████║╚██████╔╝╚██████╔╝███████║        ✧
        ✦    ╚═╝      ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝  ✦
   ✧               ✦                    ✧               ✦                    ✧
```

<div align="center">

### Many Minds. One Answer.

*A production-grade neural research OS — seven specialized agents that search, debate, reason, and synthesize in real time.*

<br/>

</div>

![Version](https://img.shields.io/badge/v3.0.0-7c3aed?style=flat-square&labelColor=0a0a1e&label=version&color=7c3aed)
![Status](https://img.shields.io/badge/production--ready-16a34a?style=flat-square&labelColor=0a0a1e&label=status)
![Python](https://img.shields.io/badge/3.11+-3b82f6?style=flat-square&labelColor=0a0a1e&label=python&logo=python&logoColor=white)
![React](https://img.shields.io/badge/18+-06b6d4?style=flat-square&labelColor=0a0a1e&label=react&logo=react&logoColor=white)
![License](https://img.shields.io/badge/proprietary-dc2626?style=flat-square&labelColor=0a0a1e&label=license)

<br/>

**[→ Live Demo](https://polynous.pages.dev)** &nbsp;·&nbsp; **[→ API Docs](https://polynous-api-production.up.railway.app/docs)** &nbsp;·&nbsp; **[→ Report Bug](https://github.com/pradhanashwarya2122/POLYNOUS/issues)**

<br/>

![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Frontend-Cloudflare_Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Neo4j](https://img.shields.io/badge/Graph-Neo4j_AuraDB-4581C3?style=flat-square&logo=neo4j&logoColor=white)
![Pinecone](https://img.shields.io/badge/Vectors-Pinecone-6366f1?style=flat-square&logo=pinecone&logoColor=white)
![Claude](https://img.shields.io/badge/AI-Anthropic_Claude-d97706?style=flat-square&logo=anthropic&logoColor=white)
![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-22c55e?style=flat-square&logo=chainlink&logoColor=white)

</div>

---

## Interface

> Screenshots live in `/screenshots/`. Take them from [polynous.pages.dev](https://polynous.pages.dev) and drop them in — the grid is ready.

<div align="center">

| Research | Debate | Knowledge Graph |
|:---:|:---:|:---:|
| ![Research Interface](screenshots/research.png) | ![Debate Chamber](screenshots/debate.png) | ![Knowledge Graph](screenshots/graph.png) |

| Semantic Search | Memory Bank | Neural Analytics |
|:---:|:---:|:---:|
| ![Semantic Search](screenshots/search.png) | ![Memory Bank](screenshots/memory.png) | ![Analytics Dashboard](screenshots/analytics.png) |

| Profile Setup | PDF Lab | Settings |
|:---:|:---:|:---:|
| ![Profile Setup](screenshots/profile.png) | ![PDF Lab](screenshots/pdf.png) | ![Settings](screenshots/settings.png) |

</div>

---

## What is POLYNOUS?

POLYNOUS is not a chatbot wrapper. It is a **neural research operating system** — a multi-agent AI platform where seven specialized agents orchestrate in sequence to produce research that is more thorough, more cited, and more honest about uncertainty than any single model response.

Where a single model gives you its best guess, POLYNOUS assembles a research team: one agent searches the live web, one condenses each source, one challenges findings for contradictions, and one synthesizes a structured report — with citations, confidence scores, and identified limitations. For contested topics, three additional agents run a formal adversarial debate with an AI judge that scores both sides and delivers a verdict.

Fully multi-user. Cryptographic data isolation. Bring-your-own API keys. Live knowledge graph. Semantic memory. PDF analysis. Neural analytics dashboard. All in a single deployable codebase.

---

## Why POLYNOUS?

| Capability | ChatGPT | Perplexity | POLYNOUS |
|:-----------|:-------:|:----------:|:--------:|
| Multi-agent pipeline | — | — | 7 agents |
| Real-time web search | Plus only | ✓ | ✓ |
| Per-claim confidence scoring | — | — | 0–100% |
| Adversarial debate with judge | — | — | FOR / AGAINST / VERDICT |
| Persistent knowledge graph | — | — | Neo4j, per-user |
| Semantic memory search | — | — | Pinecone namespaces |
| Bring-your-own API keys | — | — | Anthropic + OpenAI |
| Per-user data isolation | — | — | Cryptographic |
| Neural analytics dashboard | — | — | Patterns · Heatmaps · Trends |
| PDF RAG analysis | — | — | With security scanning |

---

## Table of Contents

- [Interface](#interface)
- [Onboarding](#onboarding)
- [Design Philosophy](#design-philosophy)
- [The Seven Agents](#the-seven-agents)
- [Feature Set](#feature-set)
- [Neural Analytics](#neural-analytics)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Onboarding

New users don't land in a blank chat. They walk through a guided setup:

```
Landing Page → Auth (Email / Google / GitHub) → OAuth Callback → Profile Setup → Research
                                                                       │
                                                         ┌─────────────┘
                                                         ▼
                                               ┌──────────────────────┐
                                               │   PROFILE SETUP      │
                                               │                      │
                                               │  @ neural_handle     │
                                               │  [████████░░] 8/24   │
                                               │                      │
                                               │  Response Style      │
                                               │   Academic  ● Tech   │
                                               │   ELI5      ○ Casual │
                                               │                      │
                                               │  API Keys (optional) │
                                               │  Anthropic: sk-ant-. │
                                               │  OpenAI:    sk-..... │
                                               │  Tavily:    tvly-... │
                                               │                      │
                                               │   [ INITIALIZE → ]   │
                                               └──────────────────────┘
```

- **New users** are routed through Profile Setup to choose a neural handle, pick a default response style, and optionally provide their own API keys
- **Returning users** skip directly to the research interface
- **OAuth users** are merged by email — no duplicate accounts created on repeat login
- **BYO keys** entered during setup are validated live before saving, then encrypted at rest

---

## Design Philosophy

POLYNOUS doesn't look like a SaaS dashboard. It looks like a neural interface.

| Element | Description |
|:--------|:------------|
| **Deep void background** | `#0a0a1e` base — dark enough that neon accents genuinely glow against it |
| **Bioluminescent green** | Primary accent `#00ff0f` pulses and throbs; never used as flat fill |
| **Three.js particle canvases** | Floating strand networks animate behind every page — no static backgrounds anywhere |
| **Loading as narrative** | Spinning dual-ring for OAuth handshake → pulsing dots for search → per-agent orbit tracker for research |
| **Knowledge as constellation** | Semantic search renders results as a star map — brighter stars mean higher similarity scores |
| **Glassmorphic cards** | Research reports and debate verdicts use translucent blurred containers with synapse-dot corner accents |
| **Typography** | JetBrains Mono for data and code; Sora for display — deliberately technical, not rounded SaaS |

---

## The Seven Agents

POLYNOUS runs two distinct pipelines — a four-agent **Research Pipeline** and a three-agent **Debate Pipeline** — orchestrated via LangGraph state machines.

### Research Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   SEARCH     │────▶│  SUMMARISER  │────▶│    CRITIC    │────▶│    WRITER    │
│              │     │              │     │              │     │              │
│ Queries      │     │ Condenses    │     │ Cross-refs   │     │ Synthesizes  │
│ Tavily for   │     │ each source  │     │ claims and   │     │ cited report │
│ live results │     │ to insights  │     │ scores conf. │     │ + citations  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

| Agent | Job | Model |
|:------|:----|:------|
| **Search** | Queries Tavily; extracts URLs, titles, body text | Tavily API |
| **Summariser** | Reads each source; extracts 3–5 key insight points | Claude / GPT-4o-mini |
| **Critic** | Cross-references claims; flags contradictions; assigns confidence | Claude / GPT-4o-mini |
| **Writer** | Synthesizes all summaries into a `Summary → Findings → Limitations → Confidence` report | Claude / GPT-4o-mini |

### Debate Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     FOR      │────▶│   AGAINST    │────▶│    JUDGE     │
│              │     │              │     │              │
│ Evidence-    │     │ Counter-     │     │ Scores 1–10  │
│ backed case  │     │ evidence     │     │ declares     │
│ for the prop │     │ against prop │     │ winner       │
└──────────────┘     └──────────────┘     └──────────────┘
```

| Agent | Job |
|:------|:----|
| **FOR** | Constructs supporting arguments with cited evidence |
| **AGAINST** | Constructs opposing arguments with counter-evidence |
| **Judge** | Scores each side 1–10; delivers structured reasoning; declares winner |

---

## Feature Set

### Research Mode

Seven-agent pipeline with a live agent progress tracker. Streaming via Server-Sent Events — answers arrive token-by-token as agents complete.

Every report ships in a structured format:

```
📋 Summary
🔑 Key Findings
⚠️  Limitations
🎯 Confidence Score  (animated donut chart, 0–100%)
🔗 Inline source citations
```

Response style selector — Academic / Technical / ELI5 / Casual — persisted per user and applied to all future research.

### Debate Mode

Formal proposition input with concise / detailed depth toggle. Side-by-side FOR (green) and AGAINST (red) argument panels with per-side scoring, animated comparison bars, and a structured judge verdict. Full JSON export of debate results.

### Knowledge Graph

Interactive 2D force-directed visualization built on Three.js and Canvas. Supports 70+ node types — concepts, entities, claims, sources, relationships. Features include:

- **Pathfinder** — shortest conceptual connection between any two entities
- **Centrality analysis** — highlights most-connected nodes
- **Timeline playback** — growth animation showing when each node was added
- **Full per-user isolation** — every node carries a `user_id`; all Cypher queries filter by it

### Neural Memory Bank

Research statistics dashboard covering total queries, debates, average confidence, and most active topics. Includes an interactive interest graph (Canvas), debate history with FOR/AGAINST score bars, and AI-generated topic suggestions based on your past research patterns.

### Semantic Search

Meaning-based search using Pinecone vector embeddings with Voyage AI. Results rendered as an interactive neural constellation — a star map where similarity determines proximity. Real-time autocomplete. Scoped exclusively to the authenticated user's research.

### PDF Lab

Drag-and-drop upload with a multi-stage security validation pipeline: file signature check → embedded JavaScript detection → malware pattern scan. Full RAG question-answering against uploaded content, with multi-PDF cross-referencing.

### Settings & Key Vault

Bring-your-own API keys for Anthropic, OpenAI, and Tavily — POLYNOUS uses them instead of system keys. Keys encrypted at rest with Fernet (AES-128-CBC), live-validated before saving, displayed as masked previews (`sk-ant-****-abcd`). Full data export, password change, session revocation, and account reset.

---

## Neural Analytics

> **Your research intelligence, decoded.**

The analytics dashboard transforms your research history into actionable patterns. Built with Canvas-native rendering — no chart library dependencies.

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEURAL ANALYTICS            7D  30D  90D   ↺ Refresh              │
├──────────────┬──────────────┬──────────────┬──────────────┐        │
│  Total       │  Debates     │  Avg Conf.   │  Topics      │        │
│  Queries     │              │              │  Mapped      │        │
│              │              │              │              │        │
│    2         │    1         │    60%       │    3         │        │
└──────────────┴──────────────┴──────────────┴──────────────┘        │
│                                                                     │
│  Research Activity          Top Topics                              │
│  ─────────────              ───────────                             │
│  2 sessions                 psychology · ai · systems               │
│                                                                     │
│  Confidence Distribution    Activity Heatmap                        │
│  ───────────────────────    ────────────────                        │
│  High   ████░░░░░░   0%     Mon ░░▓▓░░░░░░░░░                      │
│  Medium ██████████ 100%     Tue ░░░░▓▓▓░░░░░                       │
│  Low    ░░░░░░░░░░   0%     Wed ░░░░░░░░░░░░░    less ░ ▒ ▓ more   │
└─────────────────────────────────────────────────────────────────────┘
```

The dashboard surfaces:

- **Research Activity** — session counts and query volume over selectable windows (7D / 30D / 90D)
- **Top Topics** — most researched concepts extracted from your query history
- **Confidence Distribution** — answer quality breakdown across High / Medium / Low bands
- **Activity Heatmap** — day-of-week and time-of-day research patterns, GitHub-style

---

## System Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║  CLIENT                                                          ║
║  React 18 + Vite · Three.js · Canvas API · React Router        ║
║  polynous.pages.dev  (Cloudflare Pages — Global CDN)            ║
╚════════════════════════════╤═════════════════════════════════════╝
                             │  HTTPS / SSE
╔════════════════════════════▼═════════════════════════════════════╗
║  API                                                             ║
║  FastAPI 0.115+ · Python 3.11                                   ║
║  polynous-api-production.up.railway.app  (Railway)              ║
║                                                                  ║
║  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐ ║
║  │ Auth Middleware│  │Input Sanitizer │  │  Security Headers  │ ║
║  │ JWT + bcrypt   │  │XSS/SQLi/CMDi   │  │  CSP·HSTS·X-Frame  │ ║
║  └────────────────┘  └────────────────┘  └────────────────────┘ ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │  LANGGRAPH ORCHESTRATOR                                   │   ║
║  │  Research:  Search → Summariser → Critic → Writer        │   ║
║  │  Debate:    FOR → AGAINST → Judge                        │   ║
║  └──────────────────────────────────────────────────────────┘   ║
╚══════════╤═══════════════════╤══════════════════╤═══════════════╝
           │                   │                  │
  ┌────────▼───────┐  ┌────────▼───────┐  ┌──────▼───────────┐
  │  PostgreSQL    │  │    Neo4j        │  │    Pinecone      │
  │                │  │                │  │                  │
  │ Users          │  │ Knowledge graph│  │ Vector embeddings│
  │ Sessions       │  │ Entity linking │  │ Semantic search  │
  │ Preferences    │  │ Relationships  │  │ Per-user scoped  │
  │ Encrypted keys │  │ Per-user nodes │  │ user_{uuid} ns   │
  │ Railway managed│  │ Neo4j AuraDB   │  │ Pinecone Svrless │
  └────────────────┘  └────────────────┘  └──────────────────┘
```

### Request Lifecycle

```
1.  User submits query
2.  POST /ask-stream  ←  Bearer token
3.  Auth middleware validates JWT → attaches user_id
4.  BYO key resolver decrypts stored keys (or falls back to system keys)
5.  LangGraph initializes AgentState → begins pipeline
6.  Search Agent  →  Tavily API  →  sources with URLs and body text
7.  Summariser    →  Claude/GPT  →  condenses each source to key points
8.  Critic        →  Claude/GPT  →  cross-references claims → confidence score
9.  Writer        →  Claude/GPT  →  synthesizes structured cited report
10. SSE streams:  start → progress (per agent) → tokens → citations → end
11. On completion: stored in Neo4j (graph) + Pinecone (vectors) + PostgreSQL (history)
12. Frontend renders Neural Synthesis Report with donut chart + findings + citations
```

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|:-----------|:-------:|:--------|
| FastAPI | 0.115+ | Async HTTP framework; native async, auto OpenAPI docs |
| LangGraph | 0.2+ | Agent pipeline orchestration via state machine graphs |
| Anthropic Claude | Latest | Primary LLM for all agents |
| OpenAI GPT-4o-mini | Latest | User-selectable alternative LLM and embeddings |
| Tavily | 0.5+ | Real-time web search optimized for LLM consumption |
| Voyage AI | 0.2+ | High-quality text embeddings |
| Neo4j AuraDB | 5.x | Relationship-native graph database; Cypher traversal |
| Pinecone Serverless | 5.x | Auto-scaling vector database with namespace isolation |
| PostgreSQL | 15+ | ACID-compliant relational database; Railway-managed |
| SQLAlchemy | 2.0+ | ORM with parameterized queries; migration via Alembic |
| python-jose | 3.3+ | JWT tokens with HMAC-SHA256 signing |
| bcrypt | 4.1+ | Adaptive password hashing; salt-per-password |
| cryptography (Fernet) | 41+ | AES-128-CBC API key encryption; per-user key derivation |

### Frontend

| Technology | Version | Purpose |
|:-----------|:-------:|:--------|
| React | 18+ | UI component framework with concurrent rendering |
| Vite | 5+ | Sub-second HMR; ESBuild compilation |
| React Router | 6+ | Declarative client-side routing |
| Three.js | r128 | 3D WebGL rendering for knowledge graph and particles |
| Canvas API | Native | 2D animations; neural backgrounds; interest graphs |

### Infrastructure

| Service | Role | Tier |
|:--------|:-----|:-----|
| Railway | Backend hosting + PostgreSQL managed database | Hobby |
| Cloudflare Pages | Frontend with global CDN | Free |
| Neo4j AuraDB | Managed graph database | Free (100k nodes) |
| Pinecone Serverless | Managed vector database | Free (5M vectors) |

---

## Getting Started

### Prerequisites

| Tool | Min Version |
|:-----|:-----------:|
| Python | 3.11 |
| Node.js | 18 LTS |
| Git | 2.30 |
| PostgreSQL | 15 *(local dev only)* |

### Required API Keys

| Key | Source | Free Tier |
|:----|:-------|:----------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | $5 credit on signup |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) | 1,000 searches/month |
| `PINECONE_API_KEY` | [app.pinecone.io](https://app.pinecone.io) | 5M vectors |
| `NEO4J_URI` + credentials | [console.neo4j.io](https://console.neo4j.io) | 1 free AuraDB instance |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | Optional — fallback LLM |
| `VOYAGE_API_KEY` | [dash.voyageai.com](https://dash.voyageai.com) | Optional — embeddings |

### Environment Variables

Create `/backend/.env` from this reference:

```env
# ── LLMs ───────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...                     # Optional

# ── Search ─────────────────────────────────────────────────────────
TAVILY_API_KEY=tvly-...

# ── Embeddings ─────────────────────────────────────────────────────
VOYAGE_API_KEY=vo-...                     # Optional

# ── Databases ──────────────────────────────────────────────────────
PINECONE_API_KEY=pcsk-...
PINECONE_ENVIRONMENT=gcp-starter
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-aura-password
DATABASE_URL=postgresql://user:pass@localhost:5432/polynous

# ── Auth & Encryption ──────────────────────────────────────────────
JWT_SECRET=                               # openssl rand -hex 32
ENCRYPTION_KEY=                           # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# ── CORS ───────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5174

# ── Environment ────────────────────────────────────────────────────
ENVIRONMENT=development

# ── OAuth (Optional) ───────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Installation

```bash
# 1. Clone
git clone https://github.com/pradhanashwarya2122/POLYNOUS.git
cd POLYNOUS

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # fill in your keys
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000  |  docs at /docs

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5174
```

### Common Issues

| Error | Cause | Fix |
|:------|:------|:----|
| `ModuleNotFoundError: magic` | Missing binary on Windows | `pip install python-magic-bin` |
| `Neo4j connection refused` | Wrong URI scheme | Ensure URI starts with `neo4j+s://` |
| `Pinecone index not found` | Index auto-creates on first use | Wait 5–10s after first request |
| `CORS error` | `FRONTEND_URL` mismatch | Confirm env var matches exact frontend URL + port |
| `401 Unauthorized` | Token expired (15 min TTL) | Log in again |
| `422 Validation Error` | Malformed request body | Check `/docs` for exact schema |

---

## Project Structure

```
POLYNOUS/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint; CORS; middleware; router mounts
│   │   ├── database.py                 # SQLAlchemy async engine; session factory
│   │   ├── llm_client.py               # Multi-provider abstraction: Claude or GPT routing
│   │   ├── state.py                    # AgentState TypedDict shared across pipeline
│   │   │
│   │   ├── agents/
│   │   │   ├── summariser_agent.py
│   │   │   ├── critic_agent.py
│   │   │   ├── writer_agent.py
│   │   │   └── debate_agents.py        # FOR, AGAINST, and Judge definitions
│   │   │
│   │   ├── graph/
│   │   │   ├── orchestrator.py         # Research pipeline: 4-node StateGraph
│   │   │   └── debate_graph.py         # Debate pipeline: 3-node StateGraph
│   │   │
│   │   ├── knowledge_graph/
│   │   │   ├── graph_manager.py        # Neo4j CRUD; entity linking; pathfinder
│   │   │   ├── user_memory.py          # User-scoped memory storage
│   │   │   └── hybrid_search.py        # Combined vector + graph search
│   │   │
│   │   ├── memory/
│   │   │   └── vector_store.py         # Namespace-scoped Pinecone operations
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.py                 # Register, login, refresh, /me, password, sessions
│   │   │   ├── oauth.py                # Google + GitHub OAuth 2.0 PKCE
│   │   │   ├── api_keys.py             # BYO key CRUD: save (encrypted), retrieve (masked)
│   │   │   ├── memory.py               # Memory bank: stats, interests, history, suggestions
│   │   │   ├── knowledge.py            # Knowledge graph: data, pathfinder, connections
│   │   │   ├── semantic_search.py      # Vector search + autocomplete
│   │   │   ├── pdfs.py                 # PDF upload with security validation + RAG
│   │   │   └── settings_extended.py    # Preferences, export, reset, notifications
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth_middleware.py       # JWT extraction; attaches user to request
│   │   │   ├── input_sanitizer.py      # XSS, SQLi, command injection, path traversal
│   │   │   └── security_headers.py     # CSP, HSTS, X-Frame, X-Content-Type on every response
│   │   │
│   │   ├── models/
│   │   │   └── user.py                 # ORM: User, Conversation, Message, UserPreferences
│   │   │
│   │   └── utils/
│   │       ├── encryption.py           # Fernet encrypt/decrypt; per-user key derivation
│   │       ├── sanitizer.py            # Pure-function sanitization helpers
│   │       ├── pdf_security.py         # Header validation; embedded JS detection; malware sigs
│   │       └── key_resolver.py         # BYO key or system key resolver
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── App.jsx                     # Auth state machine; route protection; profile gate
    │   ├── main.jsx
    │   ├── config.js                   # VITE_API_URL with localhost fallback
    │   │
    │   └── components/
    │       ├── AuthPage.jsx
    │       ├── OAuthCallback.jsx
    │       ├── ProfileSetup.jsx
    │       ├── ResearchInterface.jsx    # Search; agent orbit; Neural Synthesis Report
    │       ├── DebateInterface.jsx      # FOR/AGAINST panels; judge verdict; score bars
    │       ├── KnowledgeGraphPage.jsx   # Force-directed graph; pathfinder; centrality
    │       ├── SemanticSearchPage.jsx   # Constellation UI; similarity scores
    │       ├── MemoryBank.jsx           # Stats; interest graph; timeline; debate history
    │       ├── AnalyticsDashboard.jsx   # Research patterns; heatmap; confidence distribution
    │       ├── SettingsPage.jsx         # BYO keys; preferences; danger zone
    │       ├── PdfLabPage.jsx           # Drop zone; security status; RAG interface
    │       └── LandingPage.jsx
    │
    ├── package.json
    ├── vite.config.js
    └── Dockerfile
```

---

## API Reference

Full interactive documentation at [`/docs`](https://polynous-api-production.up.railway.app/docs).

### Authentication

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `POST` | `/auth/register` | Register with email and password | — |
| `POST` | `/auth/login` | Authenticate; receive access + refresh tokens | — |
| `POST` | `/auth/refresh` | Exchange refresh token for new access token | Cookie |
| `GET` | `/auth/me` | Current user profile | Bearer |
| `PUT` | `/auth/me` | Update username | Bearer |
| `PUT` | `/auth/change-password` | Change password | Bearer |
| `POST` | `/auth/revoke-sessions` | Invalidate all active sessions | Bearer |
| `GET` | `/oauth/google` | Initiate Google OAuth 2.0 PKCE | — |
| `GET` | `/oauth/github` | Initiate GitHub OAuth 2.0 | — |

### Research & Debate

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `POST` | `/ask` | Run pipeline; returns complete JSON on completion | Bearer |
| `POST` | `/ask-stream` | Run pipeline with SSE streaming; streams agent events live | Bearer |

**Request body:**
```json
{
  "query": "How does CRISPR gene editing work?",
  "debate_mode": false,
  "response_style": "academic"
}
```

**SSE event types (`/ask-stream`):**
```
{"type": "start"}
{"type": "progress", "agent": "Search", "message": "Searching web..."}
{"type": "token", "content": "CRISPR (Clustered Regularly..."}
{"type": "citations", "citations": ["https://...", "https://..."]}
{"type": "confidence", "score": 87}
{"type": "end"}
```

**Completed response shape (`/ask`):**
```json
{
  "answer": "📋 Summary\nCRISPR is a gene-editing technology derived from a bacterial immune system...\n\n🔑 Key Findings\n• Cas9 protein acts as molecular scissors, guided by a synthetic RNA sequence [1]\n• Off-target edits remain the primary safety concern in therapeutic applications [2]\n• FDA approved first CRISPR therapy (Casgevy) for sickle cell disease in 2023 [3]\n\n⚠️ Limitations\n• Sources focus on therapeutic use — industrial/agricultural applications not covered\n• Pre-2024 clinical trial data only\n\n🎯 Confidence: 87%",
  "sources": [
    { "number": 1, "title": "Nature — CRISPR-Cas9 mechanism review", "url": "https://..." },
    { "number": 2, "title": "Science — Off-target editing analysis", "url": "https://..." },
    { "number": 3, "title": "FDA — Casgevy approval announcement", "url": "https://..." }
  ],
  "confidence": 87,
  "contradictions": ["Source 1 claims 95% specificity; Source 2 reports 78% in vivo"],
  "debate_verdict": {}
}
```

### Memory, Knowledge Graph & Analytics

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `GET` | `/memory/stats` | Research statistics | Bearer |
| `GET` | `/memory/interests` | Top topics by frequency | Bearer |
| `GET` | `/memory/history` | Full research timeline | Bearer |
| `GET` | `/memory/debates` | Debate history | Bearer |
| `GET` | `/memory/suggestions` | AI-generated topic suggestions | Bearer |
| `GET` | `/analytics/dashboard` | Aggregated analytics: activity, heatmap, confidence | Bearer |
| `GET` | `/knowledge/graph` | Full user knowledge graph | Bearer |
| `GET` | `/knowledge/connections` | Shortest path between entities | Bearer |

### Semantic Search

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `GET` | `/search?q={query}` | Semantic search over research history | Bearer |
| `GET` | `/search/suggestions?q={partial}` | Autocomplete from past queries | Bearer |

### Settings

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `GET` | `/settings/api-keys` | Retrieve key statuses (masked) | Bearer |
| `PUT` | `/settings/api-keys` | Save encrypted API key | Bearer |
| `DELETE` | `/settings/api-keys/{provider}` | Delete key by provider | Bearer |
| `POST` | `/settings/api-keys/test` | Validate key via live call | Bearer |
| `GET/PUT` | `/settings/preferences` | Read/write user preferences | Bearer |
| `GET` | `/settings/export` | Export all data as JSON | Bearer |
| `DELETE` | `/settings/memory/clear` | Clear research history | Bearer |
| `POST` | `/settings/reset` | Full account reset | Bearer |

### Error Codes

| Status | Meaning |
|:------:|:--------|
| `400` | Bad request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not found |
| `409` | Email already registered |
| `422` | Request body validation failure |
| `423` | Account locked — brute force protection (15 min) |
| `429` | Rate limited |
| `500` | Internal server error |
| `503` | Upstream database or API unreachable |

---

## Security Model

POLYNOUS was built with the assumption that it handles sensitive research data across many users. Every layer of the stack includes explicit isolation and defense.

| Layer | Mechanism | Detail |
|:------|:----------|:-------|
| Password storage | bcrypt adaptive hashing | Work factor 12; unique salt per password |
| Session tokens | Dual-token JWT model | Access: 15 min · Refresh: 7 days, HttpOnly cookie, rotation on use |
| Brute force | Exponential lockout | 5 failures → 15 min lock; counter resets on success |
| API key encryption | Per-user Fernet keys | Unique key per user at registration; encrypted before PostgreSQL write |
| API key validation | Live test before save | Real minimal API call validates key before persisting |
| Input sanitization | Multi-pattern middleware | XSS, SQL injection, shell injection, path traversal on every request |
| CORS | Whitelist-based | Explicit origin list; no wildcard |
| Security headers | Middleware-injected | CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| Neo4j isolation | Property-level filtering | Every node has `user_id`; every read: `WHERE n.user_id = $user_id` |
| Pinecone isolation | Namespace scoping | Each user assigned `user_{uuid}`; all operations namespace-scoped |
| SQL injection | ORM parameterization | 100% of queries via SQLAlchemy — no raw SQL string construction |
| PDF security | Multi-stage validation | Magic bytes → embedded JS detection → malware signature scan |
| Error handling | Safe production messages | Stack traces never surfaced to clients in production |
| Dependencies | Automated CVE scanning | `pip-audit` + `Safety` against all Python packages |

---

## Testing

All test scripts target a running local server. Start the backend before executing.

```bash
cd backend && source venv/bin/activate

python test_auth.py               # Auth flow + brute force lockout behavior
python test_multi_user.py         # Multi-user registration; UUID and email collision checks
python test_data_isolation.py     # Confirm User A cannot access User B's data
python test_settings_endpoints.py # Preferences, notifications, export, clear, reset
python test_byo_keys.py           # BYO key lifecycle: save, mask, validate, delete
python check_dependencies.py      # CVE scan against known vulnerability databases
```

---

## Deployment

### Backend → Railway

```bash
# 1. Push to GitHub
git push origin main

# 2. Railway → New Project → Deploy from GitHub repo
#    Set Root Directory: /backend
#    Add environment variables (see table above)
#    Railway auto-detects Python via Dockerfile
#    Add PostgreSQL: New → Database → PostgreSQL (DATABASE_URL set automatically)
```

Railway redeploys automatically on every push to `main`.

### Frontend → Cloudflare Pages

```
1. pages.cloudflare.com → Create application → Connect to Git
2. Build settings:
   Framework preset:       Vite
   Build command:          npm run build
   Build output directory: dist
   Root directory:         frontend
3. Environment variable:
   VITE_API_URL = https://polynous-api-production.up.railway.app
4. Deploy
```

### Docker (Local Full Stack)

```bash
docker-compose up --build
# Backend:   http://localhost:8000
# Frontend:  http://localhost:5174
# PostgreSQL is included in the compose — no separate database setup needed
```

---

## Roadmap

```
SHIPPED
  ✓  7-agent research pipeline with SSE streaming
  ✓  Debate mode: FOR / AGAINST / Judge with scoring
  ✓  Per-user Neo4j knowledge graph with pathfinder
  ✓  Pinecone semantic memory with constellation UI
  ✓  Neural analytics dashboard: heatmaps, confidence trends, topic patterns
  ✓  PDF Lab with security validation and RAG
  ✓  BYO API keys with Fernet encryption and live validation
  ✓  Google + GitHub OAuth 2.0
  ✓  Brute force protection and account lockout
  ✓  Full data export and account reset
  ✓  Railway + Cloudflare Pages production deployment

IN PROGRESS
  ⬡  Multi-PDF cross-referencing in PDF Lab
  ⬡  Knowledge graph timeline playback animation

PLANNED
  ○  Team workspaces — shared knowledge graphs across accounts
  ○  Scheduled research — recurring queries on a cron schedule
  ○  Citation verification — auto-check if source URLs are still live
  ○  Browser extension — research any webpage with one click
  ○  Self-hosted LLM via Ollama
  ○  Webhook integrations — push results to Slack / Notion
  ○  Mobile app (React Native)
```

---

## Contributing

> Before contributing, read the [License](#license) section. POLYNOUS is source-available, not open-source. Pull request submissions constitute agreement that your contribution becomes the exclusive intellectual property of the project.

```bash
# 1. Fork and clone
git clone https://github.com/your-username/POLYNOUS.git

# 2. Branch
git checkout -b feat/semantic-caching

# 3. Commit with a prefix
git commit -m "feat: add semantic caching for repeated queries"

# 4. Push and open a PR with a clear description of what changed and why
git push origin feat/semantic-caching
```

**Commit prefixes:** `feat` · `fix` · `docs` · `refactor` · `test` · `chore` · `perf` · `security`

For significant changes, open an issue first to align on approach before writing code.

---

## License

**Copyright © 2024–2025 Ashwarya Pradhan. All rights reserved.**

This repository is source-available for learning and reference. Viewing it does not grant rights to use, copy, modify, distribute, or deploy any portion of its contents — including source code, architecture, agent pipeline design, prompt engineering, database schemas, or documentation.

Contributions via pull request are accepted subject to the contributor agreement above.

For licensing inquiries, enterprise pilots, or commercial use: **[pradhanashwarya2122@gmail.com](mailto:pradhanashwarya2122@gmail.com)**

---

<div align="center">

![Python](https://img.shields.io/badge/-Python-3b82f6?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/-LangGraph-22c55e?style=flat-square&logo=chainlink&logoColor=white)
![React](https://img.shields.io/badge/-React-06b6d4?style=flat-square&logo=react&logoColor=white)
![Claude](https://img.shields.io/badge/-Anthropic_Claude-d97706?style=flat-square&logo=anthropic&logoColor=white)
![Neo4j](https://img.shields.io/badge/-Neo4j-4581C3?style=flat-square&logo=neo4j&logoColor=white)
![Pinecone](https://img.shields.io/badge/-Pinecone-6366f1?style=flat-square&logo=databricks&logoColor=white)

**[⭐ Star](https://github.com/pradhanashwarya2122/POLYNOUS)** · **[🐛 Bug](https://github.com/pradhanashwarya2122/POLYNOUS/issues)** · **[💡 Feature](https://github.com/pradhanashwarya2122/POLYNOUS/issues)** · **[📖 Docs](https://polynous-api-production.up.railway.app/docs)**

</div>