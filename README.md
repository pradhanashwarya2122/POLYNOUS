<div align="center">

```
██████╗  ██████╗ ██╗  ██╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗
██╔══██╗██╔═══██╗██║  ╚██╗ ██╔╝████╗  ██║██╔═══██╗██║   ██║██╔════╝
██████╔╝██║   ██║██║   ╚████╔╝ ██╔██╗ ██║██║   ██║██║   ██║███████╗
██╔═══╝ ██║   ██║██║    ╚██╔╝  ██║╚██╗██║██║   ██║██║   ██║╚════██║
██║     ╚██████╔╝███████╗██║   ██║ ╚████║╚██████╔╝╚██████╔╝███████║
╚═╝      ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝
```

### *Many Minds. One Answer.*

**A production-grade multi-agent AI research platform where 7 specialized agents collaborate to research, analyze, debate, and synthesize comprehensive answers — with real-time web search, confidence scoring, and knowledge graph visualization.**

---

[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-3b82f6?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/react-18.x-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Claude](https://img.shields.io/badge/powered%20by-Claude%203.5%20Haiku-cc785c?style=flat-square)](https://anthropic.com)
[![LangGraph](https://img.shields.io/badge/orchestration-LangGraph-7c3aed?style=flat-square)](https://langchain-ai.github.io/langgraph/)

</div>

---

## ◈ What is POLYNOUS?

POLYNOUS is not a chatbot. It is a **neural research operating system** — a platform where 7 AI agents operate like a research team, each with a distinct role, working in sequence to produce answers that are deeper, more critical, and more comprehensive than any single model could produce alone.

> Think of it as peer review, built into the architecture itself.

---

## ◈ The Seven Agents

```
┌──────────────────────────────────────────────────────────────────────┐
│                    RESEARCH PIPELINE                                  │
│                                                                       │
│     SEARCH      Retrieves from web (Tavily) + academic (arXiv)      │
│        ↓                                                              │
│   📝 SUMMARISER  Condenses each source to key findings               │
│        ↓                                                              │
│   🔎 CRITIC      Cross-references claims, flags contradictions        │
│        ↓                                                              │
│   ✍️  WRITER      Assembles the final cited, structured answer        │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│                    DEBATE PIPELINE                                    │
│                                                                       │
│   🟢 FOR         Argues the supporting position                       │
│   🔴 AGAINST     Argues the opposing position                         │
│   ⚖️  JUDGE       Evaluates evidence quality · declares winner        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ◈ Feature Surface

###     Research Mode
- **Multi-source search** — Web (Tavily) + Academic (arXiv) run simultaneously
- **Real-time streaming** — Watch agents work token-by-token via SSE
- **Confidence scoring** — Every claim rated 0–100% with visual indicators
- **Structured output** — Summary · Key Findings · Limitations · Sources
- **Neural thinking canvas** — 7 rotating agent nodes visualize activity in real-time

### 🗣️ Debate Mode
- **FOR vs AGAINST** — Two agents argue directly opposing positions
- **AI Judge** — Evaluates evidence quality and declares a winner with reasoning
- **Score visualization** — Animated bar comparing argument strength
- **Topic shuffler** — Auto-rotating proposition suggestions to spark ideas

### . Knowledge Graph
- **Force-directed layout** — Nodes cluster by semantic relationship
- **Live Neo4j data** — Entity connections extracted from your actual research
- **Interactive nodes** — Click to continue researching, hover for context
- **Search & filter** — Find nodes by name or entity type

###   Semantic Search
- **Neural constellation UI** — Results surface as a spatial star field
- **Vector search** — Retrieves by meaning, not keyword matching
- **Color-coded relevance** — Green (research sessions) · Red (debate sessions)
- **Live suggestions** — Results update as you type

### 💾 Memory Bank
- **Research timeline** — All past queries organized chronologically
- **Interest graph** — Visual map of topics you've explored most
- **Debate archive** — Past debates with scores preserved
- **Smart suggestions** — Auto-rotating follow-up research paths

### 📄 PDF Lab (RAG)
- **Drag-drop upload** — With chunked progress tracking
- **Semantic chunking** — 800-char overlapping windows for retrieval accuracy
- **OpenAI embeddings** — `text-embedding-3-small` (1536-dim vectors)
- **Claude-powered Q&A** — RAG pipeline with inline source citations

### 🔐 Authentication
- **Email / Password** — Standard auth with JWT
- **Google OAuth** — One-click sign-in
- **GitHub OAuth** — Developer-native login
- **Guest mode** — Explore without an account

---

## ◈ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                     │
│   Landing · Auth · Research · Debate · Graph · Search ·     │
│               Memory · PDF Lab · OAuth Callback             │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP / SSE
┌────────────────────────▼────────────────────────────────────┐
│                    FASTAPI BACKEND                           │
│                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │ Orchestrator │  │ Debate Graph │  │ PDF Processor│    │
│   │  (LangGraph) │  │  (LangGraph) │  │   (PyPDF2)   │    │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│          └─────────────────┴─────────────────┘             │
│                    AGENT ORCHESTRATION                       │
│         Search → Summarise → Critique → Write              │
│         FOR → AGAINST → Judge  (Debate mode)               │
│                                                             │
│   Routes: /auth /oauth /memory /pdfs /knowledge            │
│            /semantic-search /conversations                  │
│   Middleware: Rate Limiter                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      DATA LAYER                             │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│   │ Pinecone │  │  Neo4j   │  │  SQLite  │  │  Tavily  │ │
│   │ (Vectors)│  │  (Graph) │  │ (History)│  │  (Web)   │ │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## ◈ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | UI with neural animations |
| **Backend** | FastAPI + Uvicorn | REST API + SSE streaming |
| **Orchestration** | LangGraph | Multi-agent state machine |
| **AI Models** | Claude 3.5 Haiku | All agent reasoning |
| **Embeddings** | OpenAI `text-embedding-3-small` | Vector search + PDF RAG |
| **Vector DB** | Pinecone | Semantic search + PDF storage |
| **Graph DB** | Neo4j AuraDB | Knowledge graph |
| **Relational DB** | SQLite | Chat history + user data |
| **Web Search** | Tavily API | Real-time web retrieval |
| **Auth** | JWT + OAuth2 | Google + GitHub login |

---

## ◈ Prerequisites

**Software**

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| Git | Any |

**API Keys** — all services have free tiers

| Service | Link | Free Tier |
|---------|------|-----------|
| Anthropic | [console.anthropic.com](https://console.anthropic.com) | $5 credits |
| OpenAI | [platform.openai.com](https://platform.openai.com) | $5 credits |
| Pinecone | [pinecone.io](https://pinecone.io) | 1 index · 100K vectors |
| Tavily | [tavily.com](https://tavily.com) | 1,000 searches/month |
| Neo4j AuraDB | [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura) | Free instance |

---

## ◈ Installation

### 1 — Clone

```bash
git clone https://github.com/pradhanashwarya2122/POLYNOUS.git
cd POLYNOUS
```

### 2 — Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

Create `.env` in `/backend`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
PINECONE_API_KEY=pcsk-your-key-here
PINECONE_ENVIRONMENT=gcp-starter
TAVILY_API_KEY=tvly-your-key-here
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
JWT_SECRET=your-secret-key-here
```

> ⚠️ Replace every placeholder with your actual credentials before starting.

### 3 — Frontend

```bash
cd ../frontend
npm install
```

### 4 — Start

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

### 5 — Open

```
http://localhost:5173
```

---

## ◈ Project Structure

```
POLYNOUS/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint
│   │   ├── state.py                   # Agent state schema
│   │   ├── database.py                # SQLite init
│   │   ├── embeddings.py              # OpenAI embeddings
│   │   ├── chat_history.py            # SQLite chat persistence
│   │   ├── semantic_search.py         # Pinecone vector search
│   │   ├── search_agent.py            # Tavily + arXiv retrieval
│   │   ├── agents/
│   │   │   ├── summariser_agent.py
│   │   │   ├── critic_agent.py
│   │   │   ├── writer_agent.py
│   │   │   └── debate_agents.py       # FOR / AGAINST / Judge
│   │   ├── graph/
│   │   │   ├── orchestrator.py        # Research workflow graph
│   │   │   └── debate_graph.py        # Debate workflow graph
│   │   ├── knowledge_graph/
│   │   │   ├── graph_manager.py       # Neo4j operations
│   │   │   └── user_memory.py         # User profile graph
│   │   ├── data_sources/
│   │   │   └── pdf_processor.py       # PDF RAG pipeline
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── oauth.py
│   │   │   ├── memory.py
│   │   │   ├── pdfs.py
│   │   │   ├── knowledge.py
│   │   │   ├── semantic_search.py
│   │   │   └── conversations.py
│   │   ├── middleware/
│   │   │   └── rate_limiter.py
│   │   └── utils/
│   │       └── prompts.py
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
    │       ├── LandingPage2.jsx
    │       ├── AuthPage.jsx
    │       ├── ResearchInterface.jsx
    │       ├── DebateInterface.jsx
    │       ├── KnowledgeGraphPage.jsx
    │       ├── SemanticSearchPage.jsx
    │       ├── MemoryBank.jsx
    │       ├── PdfLabPage.jsx
    │       └── OAuthCallback.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## ◈ Troubleshooting

| Symptom | Fix |
|---------|-----|
| Pinecone dimension mismatch | Delete and recreate the index: `python reset_pinecone.py` |
| Neo4j connection refused | Verify `.env` credentials · confirm AuraDB instance is active |
| CORS errors in browser | Ensure backend is running on port 8000 |
| 307 redirect on `/search` | Use trailing slash: `/search/?query=...` |
| Model not found error | Use `claude-3-5-haiku-20241022` exactly |
| Port 8000 already in use | `netstat -ano \| findstr :8000` → `taskkill /PID <PID> /F` |

---

## ◈ Use Cases

| Who | How they use POLYNOUS |
|-----|-----------------------|
| **Researchers** | Deep-dive any topic with cited multi-source answers; upload papers for RAG |
| **Students** | Structured research for assignments; debate mode for critical thinking practice |
| **Analysts** | Competitive intelligence and market research with confidence scoring |
| **Debaters** | Stress-test arguments by seeing both sides evaluated by an AI judge |
| **Knowledge workers** | Build a personal knowledge graph; search past research by meaning |
 
---

<div align="center">

**POLYNOUS** · Many Minds, One Answer

*7 Agents · Real-time Research · Knowledge Graph · Debate Mode · PDF RAG*

[GitHub](https://github.com/pradhanashwarya2122/POLYNOUS) · [Report a Bug](https://github.com/pradhanashwarya2122/POLYNOUS/issues) · [pradhanashwarya2122](https://github.com/pradhanashwarya2122)

</div>
