<!--
  POLYNOUS README
  Notes to self:
  - Keep this in first person. It's my project, I want it to read like I wrote it.
  - No em-dashes anywhere. Commas, colons, parentheses, periods only.
  - "Shipped" = actually in the code. "Building next" = roadmap, do not claim as done.
  - Screenshots go in /screenshots. Update the badges/URLs if I move hosts.
-->

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

*A multi-agent research platform I built: seven specialized agents that search, debate, reason, and synthesize in real time.*

<br/>

</div>

![Version](https://img.shields.io/badge/v3.0.0-7c3aed?style=flat-square&labelColor=0a0a1e&label=version&color=7c3aed)
![Status](https://img.shields.io/badge/production--ready-16a34a?style=flat-square&labelColor=0a0a1e&label=status)
![Python](https://img.shields.io/badge/3.11+-3b82f6?style=flat-square&labelColor=0a0a1e&label=python&logo=python&logoColor=white)
![React](https://img.shields.io/badge/18+-06b6d4?style=flat-square&labelColor=0a0a1e&label=react&logo=react&logoColor=white)
![License](https://img.shields.io/badge/proprietary-dc2626?style=flat-square&labelColor=0a0a1e&label=license)

<br/>

**[Live Demo](https://polynous.pages.dev)** &nbsp;·&nbsp; **[API Docs](https://polynous-api-production.up.railway.app/docs)** &nbsp;·&nbsp; **[Report a Bug](https://github.com/pradhanashwarya2122/POLYNOUS/issues)**

<br/>

![Backend](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Cloudflare_Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Neo4j](https://img.shields.io/badge/Graph-Neo4j_AuraDB-4581C3?style=flat-square&logo=neo4j&logoColor=white)
![Pinecone](https://img.shields.io/badge/Vectors-Pinecone-6366f1?style=flat-square&logo=pinecone&logoColor=white)
![Claude](https://img.shields.io/badge/AI-Anthropic_Claude-d97706?style=flat-square&logo=anthropic&logoColor=white)
![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-22c55e?style=flat-square&logo=chainlink&logoColor=white)

</div>

---

## What I built

POLYNOUS is not a chatbot wrapper. It's a multi-agent research platform where seven specialized agents run in sequence to produce research that is more thorough, more cited, and more honest about uncertainty than any single model reply.

The idea is simple. A single model gives you one confident guess with no sources you can open and no sense of what it got wrong. I wanted the opposite. So I assembled a research team: one agent searches the live web, one condenses each source, one challenges the findings for contradictions, and one writes a structured report with citations, a computed confidence score, and honest limitations. For contested topics, three more agents run a formal adversarial debate where an AI judge scores both sides on a real rubric and delivers a verdict I can actually inspect.

It's fully multi-user with cryptographic data isolation, bring-your-own API keys across seven providers, a live per-user knowledge graph, semantic memory, PDF analysis, and an analytics dashboard. All of it ships in one deployable codebase.

<!-- The honest pitch: I care that the numbers are real. Scores are computed from citations
     verified against the source list, confidence is computed from the sources, and telemetry
     is the actual token spend on your own key. Nothing here is decorative or hard-coded. -->

---

## Interface

> Screenshots live in `/screenshots/`. I take them from [polynous.pages.dev](https://polynous.pages.dev) and drop them into the grid.

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

## Why I think it's different

| Capability | ChatGPT | Perplexity | POLYNOUS |
|:-----------|:-------:|:----------:|:--------:|
| Multi-agent pipeline | No | No | 7 agents |
| Real-time web search | Plus only | Yes | Yes |
| Per-claim confidence, computed from sources | No | No | 0 to 100% |
| Adversarial debate with a rubric judge | No | No | FOR / AGAINST / VERDICT |
| Grounded vs fabricated citation counting | No | No | Per advocate, verified |
| Persistent knowledge graph | No | No | Neo4j, per user |
| Semantic memory search | No | No | Pinecone namespaces |
| Bring-your-own keys, 7 providers | No | No | Yes |
| Per-user cryptographic isolation | No | No | Yes |
| Honest run telemetry (your real spend) | No | No | Tokens, cost, per stage |
| PDF RAG with security scanning | No | No | Yes |

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
- [Intelligence Roadmap](#intelligence-roadmap)
- [License](#license)

---

## Onboarding

I didn't want new users to land in a blank chat, so I built a guided setup:

```
Landing Page  ->  Auth (Email / Google / GitHub)  ->  OAuth Callback  ->  Profile Setup  ->  Research
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
                                                      │  Connect API keys    │
                                                      │  (optional, collapsed)│
                                                      │                      │
                                                      │   [ INITIALIZE ]     │
                                                      └──────────────────────┘
```

- New users pick a neural handle, choose a default response style, and can optionally connect their own API keys. The keys section is a collapsible card so first-run isn't a wall of eight inputs.
- Returning users skip straight to research. Their saved preferences (default mode, response style, streaming, autosave, confidence threshold) load on mount, so the app doesn't silently fall back to defaults on a reload.
- OAuth users are merged by email, so repeat logins never create a duplicate account.
- Keys entered during setup are validated with a live call before saving, then encrypted at rest.

---

## Design Philosophy

POLYNOUS doesn't look like a SaaS dashboard. It looks like a neural interface.

| Element | What I did |
|:--------|:------------|
| Deep void background | `#0a0a1e` base, dark enough that the neon accents actually glow |
| Bioluminescent green | Primary accent `#00ff0f`, used as a glow and pulse, never a flat fill |
| Three.js particle canvases | Floating strand networks animate behind every page, no static backgrounds |
| Loading as narrative | A dual ring for the OAuth handshake, pulsing dots for search, a per-agent orbit tracker for research, and an explicit "finalizing" state at 100% so you never wonder whether it stalled |
| Knowledge as constellation | Semantic search renders results as a star map where brighter stars mean higher similarity |
| Glassmorphic cards | Reports and verdicts use translucent blurred containers with synapse-dot corners |
| Typography | JetBrains Mono for data and code, Sora for display, deliberately technical, not rounded SaaS |
| Route skeletons | Full-page navigations paint a per-route skeleton that mirrors the destination, theme-tinted per page, on the dark background, never a white flash |
| Smooth cursor | A spring-following pointer that rotates toward motion, auto-disabled for touch and reduced-motion |
| Living suggestions | Research and Debate topic decks auto-shuffle through a large pool with a staggered crossfade |

---

## The Seven Agents

I run two pipelines: a four-agent Research pipeline and a three-agent Debate pipeline, both orchestrated with LangGraph state machines.

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

| Agent | Job |
|:------|:----|
| Search | Queries Tavily, extracts URLs, titles, and body text |
| Summariser | Reads each source and pulls out the key insight points |
| Critic | Cross-references claims, flags contradictions, produces the agreement and disagreement groups |
| Writer | Synthesizes everything into a structured, cited report |

### Debate Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     FOR      │────▶│   AGAINST    │────▶│    JUDGE     │
│              │     │              │     │              │
│ Evidence-    │     │ Counter-     │     │ Rubric score │
│ backed case  │     │ evidence     │     │ + verdict    │
└──────────────┘     └──────────────┘     └──────────────┘
```

| Agent | Job |
|:------|:----|
| FOR | Builds the supporting case with cited evidence |
| AGAINST | Builds the opposing case with counter-evidence |
| Judge | Scores each side, blends a computed evidence rubric with its own quality read, and declares a winner |

<!-- The judge score is not vibes. It's 0.5 * computed_evidence_rubric + 0.5 * judge_quality.
     The rubric is computed from citations verified against the real source list, so an argument
     that cites [9] when only 6 sources exist earns nothing for that citation. -->

---

## Feature Set

### Research Mode

Seven-agent pipeline with a live agent progress tracker, streamed over Server-Sent Events so the answer arrives as each agent completes. Every report ships in a structured, formatted layout, not a wall of text:

- **Executive Summary** as the hero of the page, in a gradient-framed card with bold and citation rendering.
- **Key Findings** with inline, clickable citation chips that open the source in a new tab.
- **Source Intelligence** as a per-source table: numbered badge, favicon, title, domain, a type badge (ACADEMIC, NEWS, OPINION, SNIPPET), and a click-through link.
- **Source Quality Assessment** as per-source credibility cards with a computed trust tier (High trust, Moderate, Verify) and the factual note.
- **Consensus Map** and **Divergence Map** as collapsible cards.
- **Contradiction Resolution** parsed into Claim A, Claim B, and Resolution blocks instead of a dumped paragraph.
- **Confidence Matrix** where the overall score opens a full provenance modal showing exactly how it was computed.
- **Research Trajectory**, a numbered roadmap of what to look at next.
- **Chat with this report**, always enabled, grounded only in the sources already fetched, with an animated typing state. No new web search, so it stays cheap and fast.

Confidence is computed mechanically from the sources, not written by the model: source agreement (salient-term overlap across sources), domain diversity (entropy of the domain distribution, trust-weighted), recency (half-life decay on publish dates), and claim grounding (share of sentences carrying a valid citation). Faithfulness shows how many answer sentences trace back to a real citation and flags any uncited factual claims.

Response style (Academic, Technical, ELI5, Casual) is chosen at setup, persisted per user, and applied to every future run.

### Debate Mode

A formal proposition input with a concise or detailed depth toggle, side-by-side FOR (green) and AGAINST (red) panels, and a judge verdict I can actually inspect. What makes it more than two columns of text:

- **Evidence Ledger per advocate.** Each side shows its computed evidence score, distinct real sources cited, grounded-sentence coverage, and the count of fabricated citations (citations pointing at sources that do not exist), all in red when they show up. These are computed, never hard-coded.
- **Clash Meter.** A gradient clash track with a glowing seam sitting at the true balance point, driven by the real scores.
- **Judge's Lens.** Re-score the same debate through a different value frame (impartial, economist, ethicist, pragmatist) and watch who wins change.
- **Cross-examination.** Each side puts its sharpest question to the other and has to answer honestly, generated from the completed debate.
- **Join the Debate.** I can add my own argument for a side. The opposing advocate replies, then the judge re-scores with my point folded in. It reuses the existing sources, so there is no re-scrape, just a small LLM cost.
- **What flips this.** A slider that live-recomputes the winner as I shift the weight between evidence and argument quality. It's real math on the verdict components, not a for-show animation.
- **Judge Track Record** plus an agree or disagree vote that records to the database and updates the historical agreement rate.
- **Run telemetry** sits at the end, right before the follow-up questions, and a full JSON export of the case file.

### Knowledge Graph

An interactive force-directed graph built on Three.js and Canvas, per user, with everything filtered by `user_id` at the Cypher level. It supports concepts, entities, claims, sources, and relationships, with a pathfinder for the shortest conceptual connection between two entities, a centrality highlight for the most-connected nodes, and a timeline of when each node was added. The sidebar stays visible on the start screen so the page never feels empty.

<!-- Honest note for interviewers: today entity extraction is regex-based and edge scores are
     simple. The Intelligence Roadmap below is exactly how I'm turning this into real graph ML
     (PageRank, Louvain, node2vec, link prediction, GraphRAG). I'd rather flag it than fake it. -->

### Semantic Search

Meaning-based search over my own research history using real OpenAI embeddings (`text-embedding-3-small`, 1536 dimensions) and Pinecone cosine similarity, scoped to my user namespace. Results render as an interactive constellation where similarity sets proximity, with real-time autocomplete and a keyword fallback if the vector path is unavailable.

### PDF Lab

Drag-and-drop upload with a multi-stage security pipeline (file signature check, embedded JavaScript detection, malware pattern scan), then chunking, embedding with my own key, and Pinecone storage. Ask questions against the content and get a grounded, premium-formatted answer: a header with a confidence pill, headings and numbered steps, bold and superscript citation chips, and a "retrieved passages" panel with per-chunk relevance bars. There's an animated explainer of how the RAG flow works, and a semantic vector search mode that returns the closest chunks by meaning with no LLM overhead.

### Settings and Key Vault

Bring-your-own keys for Anthropic, OpenAI, Google, Mistral, Groq, NVIDIA, and DeepSeek, plus Tavily and Voyage. The whole app is provider-agnostic: whichever key I set as preferred is the one every agent uses and the one the telemetry attributes cost to. Keys are Fernet-encrypted at rest, live-validated before saving, shown as masked previews, and managed one provider at a time behind a collapsible picker. There's a usage and credits view, streaming, autosave and confidence toggles with tooltips, full data export, password change, session revocation, and account reset.

<!-- Provider quirk I had to handle: OpenAI's newer models reject max_tokens (they want
     max_completion_tokens) and non-default temperature. I wrote a small self-healing wrapper
     (openai_compat) that retries with the corrected params, so every provider "just works". -->

### Run Telemetry and Cost Awareness

Every run reports real usage, never fabricated. When a provider returns token counts I fold them into a per-run card: real input and output tokens, the LLM call count, an estimated USD cost from a per-model price table (always labelled an estimate, shown as a dash when a model has no price), a per-stage breakdown, a provider and model badge naming the exact key that was billed, and scrape-cache hits. Because the keys are mine, this is my spend on my key, surfaced honestly.

### Research Caching

Identical research inside a freshness window is served from a per-user cache instead of re-running the whole pipeline, cutting latency and token cost to near zero on repeats, with the cache status shown in the report.

### Owner Admin View

An `ADMIN_EMAILS`-gated overview of the user base (counts, tiers, join and last-active timestamps, configured providers) that never exposes passwords (one-way hashed) or key values (encrypted), and hides itself for non-admin accounts.

---

## Neural Analytics

> My research history, decoded.

The analytics dashboard turns history into patterns, rendered on Canvas with no chart-library dependency.

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEURAL ANALYTICS            7D  30D  90D   ↺ Refresh                 │
├──────────────┬──────────────┬──────────────┬──────────────┐          │
│  Total       │  Debates     │  Avg Conf.   │  Topics      │          │
│  Queries     │              │              │  Mapped      │          │
│    2         │    1         │    60%       │    3         │          │
└──────────────┴──────────────┴──────────────┴──────────────┘          │
│  Research Activity          Top Topics                               │
│  2 sessions                 psychology · ai · systems                │
│  Confidence Distribution    Activity Heatmap                         │
│  High   ████░░░░░░   0%     Mon ░░▓▓░░░░░░░░░                        │
│  Medium ██████████ 100%     Tue ░░░░▓▓▓░░░░░                         │
│  Low    ░░░░░░░░░░   0%     Wed ░░░░░░░░░░░░   less ░ ▒ ▓ more        │
└─────────────────────────────────────────────────────────────────────┘
```

It surfaces research activity over 7, 30, and 90 day windows, top topics from my query history, a confidence distribution across high, medium, and low bands, and a GitHub-style activity heatmap by day and time.

---

## System Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║  CLIENT                                                           ║
║  React 18 + Vite · Three.js · Canvas API · React Router          ║
║  polynous.pages.dev  (Cloudflare Pages, Global CDN)              ║
╚════════════════════════════╤═════════════════════════════════════╝
                             │  HTTPS / SSE
╔════════════════════════════▼═════════════════════════════════════╗
║  API                                                             ║
║  FastAPI 0.115+ · Python 3.11                                    ║
║                                                                  ║
║  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  ║
║  │ Auth Middleware│  │Input Sanitizer │  │  Security Headers   │  ║
║  │ JWT + bcrypt   │  │XSS/SQLi/CMDi   │  │  CSP·HSTS·X-Frame    │  ║
║  └────────────────┘  └────────────────┘  └────────────────────┘  ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │  LANGGRAPH ORCHESTRATOR                                   │   ║
║  │  Research:  Search -> Summariser -> Critic -> Writer      │   ║
║  │  Debate:    FOR -> AGAINST -> Judge                       │   ║
║  └──────────────────────────────────────────────────────────┘   ║
╚══════════╤═══════════════════╤══════════════════╤═══════════════╝
           │                   │                  │
  ┌────────▼───────┐  ┌────────▼───────┐  ┌──────▼───────────┐
  │  PostgreSQL    │  │    Neo4j        │  │    Pinecone      │
  │ Users          │  │ Knowledge graph │  │ Vector embeddings│
  │ Sessions       │  │ Entity linking  │  │ Semantic search  │
  │ Preferences    │  │ Relationships   │  │ Per-user scoped  │
  │ Encrypted keys │  │ Per-user nodes  │  │ user_{uuid} ns   │
  └────────────────┘  └────────────────┘  └──────────────────┘
```

### Request lifecycle

```
1.  I submit a query
2.  POST /ask-visual  with a Bearer token
3.  Auth middleware validates the JWT and attaches user_id
4.  The BYO key resolver decrypts my stored key for the preferred provider
5.  LangGraph initializes AgentState and starts the pipeline
6.  Search  ->  Tavily  ->  sources with URLs and body text
7.  Summariser  ->  my chosen model  ->  key points per source
8.  Critic  ->  agreement and disagreement groups
9.  Writer  ->  the structured, cited report
10. SSE streams: start, per-agent progress, the visual patches, the final report
11. On completion: stored in Neo4j, Pinecone, and PostgreSQL
12. The frontend renders the report with the executive summary, findings, and confidence
```

<!-- CORS gotcha I fixed: Starlette generates unhandled-500 responses OUTSIDE the CORS
     middleware, so an error had no Access-Control-Allow-Origin header and the browser
     reported a false "can't reach the server". I attach CORS headers in the exception
     handlers now, so real error messages actually reach the UI. -->

---

## Tech Stack

### Backend

| Technology | Purpose |
|:-----------|:--------|
| FastAPI | Async HTTP framework, auto OpenAPI docs |
| LangGraph | Agent pipeline orchestration via state-machine graphs |
| Anthropic, OpenAI, Google, Mistral, Groq, NVIDIA, DeepSeek | User-selectable LLM providers (bring your own key) |
| OpenAI embeddings | `text-embedding-3-small`, 1536 dimensions, for search and RAG |
| Tavily | Real-time web search tuned for LLM consumption |
| Neo4j AuraDB | Relationship-native graph database, Cypher traversal |
| Pinecone Serverless | Vector database with per-user namespace isolation |
| PostgreSQL | Relational store for users, sessions, preferences, encrypted keys |
| SQLAlchemy + Alembic | ORM with parameterized queries and migrations |
| python-jose | JWT with HMAC-SHA256 |
| bcrypt | Adaptive password hashing, salt per password |
| cryptography (Fernet) | Per-user API key encryption |

### Frontend

| Technology | Purpose |
|:-----------|:--------|
| React 18 + Vite | UI with sub-second HMR |
| React Router 6 | Client-side routing |
| Three.js | WebGL for the knowledge graph and particle canvases |
| Canvas API | 2D animations, neural backgrounds, interest graphs |
| motion / GSAP | Reveal animations and micro-interactions |

### Infrastructure

| Service | Role |
|:--------|:-----|
| Railway | Backend hosting and managed PostgreSQL |
| Cloudflare Pages | Frontend on a global CDN |
| Neo4j AuraDB | Managed graph database (free tier) |
| Pinecone Serverless | Managed vector database (free tier) |

---

## Getting Started

### Prerequisites

| Tool | Min version |
|:-----|:-----------:|
| Python | 3.11 |
| Node.js | 18 LTS |
| Git | 2.30 |
| PostgreSQL | 15 (local dev only) |

### Environment variables

Create `backend/.env` from this reference:

```env
# LLMs (bring your own; at least one)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...

# Search
TAVILY_API_KEY=tvly-...

# Databases
PINECONE_API_KEY=pcsk-...
PINECONE_ENVIRONMENT=gcp-starter
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-aura-password
DATABASE_URL=postgresql://user:pass@localhost:5432/polynous

# Auth and encryption
JWT_SECRET=                 # openssl rand -hex 32
ENCRYPTION_KEY=             # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# CORS
FRONTEND_URL=http://localhost:5174

# Environment
ENVIRONMENT=development

# OAuth (optional)
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
# http://localhost:8000, docs at /docs

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
# http://localhost:5174
```

### Common issues

| Error | Cause | Fix |
|:------|:------|:----|
| `ModuleNotFoundError: magic` | Missing binary on Windows | `pip install python-magic-bin` |
| `Neo4j connection refused` | Wrong URI scheme | The URI must start with `neo4j+s://` |
| `Pinecone index not found` | Index auto-creates on first use | Wait 5 to 10 seconds after the first request |
| `CORS error` | `FRONTEND_URL` mismatch | Match the env var to the exact frontend URL and port |
| `401 Unauthorized` | Access token expired (15 min TTL) | Log in again, or let the proactive refresh handle it |
| `422 Validation Error` | Malformed request body | Check `/docs` for the exact schema |

---

## Project Structure

```
POLYNOUS/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint, CORS, middleware, router mounts
│   │   ├── cors_config.py              # Env-driven allowlist + preview-host regex + error CORS
│   │   ├── errors.py                   # Exception handlers (CORS-safe error responses)
│   │   ├── llm_client.py               # Multi-provider LLM + embedding abstraction
│   │   ├── llm_providers.py            # Provider registry and model resolution
│   │   ├── embeddings.py               # OpenAI text-embedding-3-small (BYO key)
│   │   ├── semantic_search.py          # Pinecone cosine search, user-namespaced
│   │   │
│   │   ├── agents/
│   │   │   ├── summariser_agent.py
│   │   │   ├── critic_agent.py
│   │   │   ├── writer_agent.py
│   │   │   └── debate_agents.py        # FOR, AGAINST, Judge + compute_argument_rubric
│   │   │
│   │   ├── graph/
│   │   │   ├── orchestrator.py         # Research pipeline: 4-node StateGraph
│   │   │   └── debate_graph.py         # Debate pipeline: 3-node StateGraph
│   │   │
│   │   ├── knowledge_graph/
│   │   │   ├── graph_manager.py        # Neo4j CRUD, entity linking, pathfinder
│   │   │   ├── user_memory.py          # User-scoped memory
│   │   │   └── hybrid_search.py        # Combined vector + graph search
│   │   │
│   │   ├── visual/
│   │   │   ├── builder.py              # Research live-view patches (agents, faithfulness, contradiction, source panels)
│   │   │   └── debate_builder.py       # Debate live-view patches
│   │   │
│   │   ├── utils/
│   │   │   ├── computed_confidence.py  # Source-derived confidence (agreement, diversity, recency, grounding)
│   │   │   ├── openai_compat.py        # Self-healing max_tokens / temperature wrapper
│   │   │   ├── encryption.py           # Fernet encrypt/decrypt, per-user keys
│   │   │   └── pdf_security.py         # Header validation, embedded JS detection, malware sigs
│   │   │
│   │   └── routes/
│   │       ├── auth.py, oauth.py, api_keys.py, settings_extended.py
│   │       ├── research_stream.py       # /ask, /ask-stream, /ask-visual, /debate-visual, /debate-vote
│   │       ├── debate_followup.py       # /debate/rejudge, /debate/cross-exam, /debate/respond
│   │       ├── report_chat.py           # Chat with a finished report
│   │       ├── knowledge.py, semantic_search.py, memory.py, pdfs.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    └── src/
        ├── App.jsx                     # Auth state, route protection, proactive token refresh
        └── components/
            ├── ResearchInterface.jsx    # Search, agent orbit, report
            ├── NeuralResearchEngine.jsx # Live research engine (SSE patches, clickable source graphs)
            ├── DebateInterface.jsx      # Podiums, evidence ledger, clash meter, follow-ups
            ├── DebateEngine.jsx         # Live debate engine with finalizing state
            ├── report/NeuralSynthesisReport.jsx  # Executive hero, source cards, confidence matrix, chat
            ├── KnowledgeGraphPage.jsx, SemanticSearchPage.jsx
            ├── PdfLabPage.jsx, MemoryBank.jsx, SettingsPage.jsx
            └── ...
```

---

## API Reference

Full interactive docs at `/docs`.

### Authentication

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| POST | `/auth/register` | Register with email and password | none |
| POST | `/auth/login` | Authenticate, receive access and refresh tokens | none |
| POST | `/auth/refresh` | Exchange the refresh token for a new access token | Cookie |
| GET | `/auth/me` | Current user profile | Bearer |
| PUT | `/auth/me` | Update username | Bearer |
| POST | `/auth/revoke-sessions` | Invalidate all sessions | Bearer |
| GET | `/oauth/google`, `/oauth/github` | Start OAuth 2.0 | none |

### Research and Debate

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| POST | `/ask` | Run the pipeline, return complete JSON | Bearer |
| POST | `/ask-stream` | Run with SSE streaming | Bearer |
| POST | `/ask-visual` | Run with the rich per-agent visual stream | Bearer |
| POST | `/debate-visual` | Run the debate pipeline with the visual stream | Bearer |
| POST | `/debate-vote` | Record an agree or disagree vote, get the track record | Bearer |
| POST | `/debate/rejudge` | Re-score through a persona lens | Bearer |
| POST | `/debate/cross-exam` | Generate a cross-examination round | Bearer |
| POST | `/debate/respond` | Fold in a user argument, opponent replies, re-judge | Bearer |
| POST | `/report/chat` | Ask a follow-up grounded in a finished report | Bearer |

**Request body (`/ask-visual`):**
```json
{ "query": "How does CRISPR gene editing work?", "debate_mode": false, "response_style": "academic" }
```

### Memory, Knowledge Graph, Search

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| GET | `/memory/stats`, `/memory/history`, `/memory/debates`, `/memory/suggestions` | Memory bank data | Bearer |
| GET | `/analytics/dashboard` | Activity, heatmap, confidence distribution | Bearer |
| GET | `/knowledge/graph`, `/knowledge/connections` | Graph data and pathfinding | Bearer |
| GET | `/search?q={query}` | Semantic search over my research | Bearer |

### Settings

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| GET / PUT / DELETE | `/settings/api-keys` | Manage encrypted keys (masked on read) | Bearer |
| POST | `/settings/api-keys/test` | Validate a key with a live call | Bearer |
| GET / PUT | `/settings/preferences` | Read or write preferences | Bearer |
| GET | `/settings/export` | Export all my data as JSON | Bearer |
| POST | `/settings/reset` | Full account reset | Bearer |

---

## Security Model

I built this assuming it handles sensitive research across many users, so every layer has explicit isolation and defense.

| Layer | Mechanism |
|:------|:----------|
| Password storage | bcrypt, work factor 12, unique salt per password |
| Session tokens | Access JWT 15 min, refresh token 30 days in an HttpOnly cookie, rotated on use |
| Brute force | Exponential lockout: 5 failures give a 15 min lock, reset on success |
| API key encryption | Per-user Fernet key, encrypted before the PostgreSQL write |
| API key validation | A real minimal call validates a key before it is saved |
| Input sanitization | Middleware for XSS, SQL injection, shell injection, path traversal on every request |
| CORS | Env-driven allowlist plus a preview-host regex, no wildcard, and CORS headers on error responses |
| Security headers | CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff |
| Neo4j isolation | Every node carries `user_id`, every read filters `WHERE n.user_id = $user_id` |
| Pinecone isolation | Each user gets `user_{uuid}`, all operations are namespace-scoped |
| SQL injection | Every query goes through SQLAlchemy, no raw string SQL |
| PDF security | Magic bytes, embedded JS detection, malware signature scan |
| Error handling | Safe production messages, stack traces never reach clients in production |

---

## Testing

The scripts target a running local server. Start the backend first.

```bash
cd backend && source venv/bin/activate

python test_auth.py               # Auth flow + brute-force lockout
python test_multi_user.py         # Registration, UUID and email collision checks
python test_data_isolation.py     # Confirm User A cannot read User B's data
python test_byo_keys.py           # Key lifecycle: save, mask, validate, delete
```

---

## Deployment

### Backend

```bash
git push origin main
# New project from the GitHub repo, root directory /backend
# Add the environment variables from the table above
# Add a managed PostgreSQL; DATABASE_URL is wired automatically
```

### Frontend (Cloudflare Pages)

```
Framework preset:       Vite
Build command:          npm run build
Build output directory: dist
Root directory:         frontend
Environment variable:   VITE_API_URL = <your backend URL>
```

### Docker (local full stack)

```bash
docker-compose up --build
# Backend  http://localhost:8000
# Frontend http://localhost:5174
```

---

## Intelligence Roadmap

<!-- This is the part I care most about long-term. Right now the knowledge graph stores nodes;
     the goal is to actually run math, ML, DL, and GenAI on top of it. Everything below is
     planned, not shipped. I keep the line clear on purpose. -->

The honest state today: semantic search and PDF RAG use real embeddings and cosine similarity, but the knowledge graph is still mostly storage (regex entity extraction, simple edge scores, no graph algorithms). Here's how I'm closing that gap. All of this runs on my current stack (Neo4j GDS, scikit-learn, CPU, plus bring-your-own model keys), no GPU required.

### Credibility fixes first

- Replace the regex entity extraction with an LLM triple extractor that returns typed relations (`{subject, relation, object, confidence}`, relations like CAUSES, SUPPORTS, REFUTES, PART_OF, CONTRADICTS). An edge then reads "mRNA vaccines ENABLES rapid pandemic response (0.82)" instead of a bare co-occurrence.
- Replace hard-coded edge weights with computed node similarity.
- Route the hybrid search through the real embedding function everywhere.

### Real graph ML (Neo4j GDS, runs in the database)

- **PageRank** to rank which concepts are load-bearing in my knowledge.
- **Betweenness centrality** to find the bridge ideas that connect otherwise-separate clusters.
- **Louvain community detection** so the graph self-organizes into themes, each auto-labelled.
- **node2vec** structural embeddings, so I can find concepts that are topologically similar, not just semantically similar.
- **Link prediction** (Adamic-Adar, then node2vec) as a recommendation engine over my own knowledge: "you researched X and Y separately, they are probably related."

### GraphRAG, the headline

Answer a question by embedding it, finding entry nodes, expanding a multi-hop subgraph, feeding that structured subgraph to the model, and showing the exact reasoning path as the citation. This is personal GraphRAG over a graph I built myself, which is rarer than doing it over a static corpus.

### Retrieval quality (PDF and Search)

- Semantic chunking on embedding-similarity boundaries instead of fixed characters.
- Two-stage retrieval with a cross-encoder reranker (bi-encoder recall, cross-encoder precision).
- Hybrid BM25 plus dense retrieval with reciprocal rank fusion.
- Page-anchored citations that scroll the PDF to the highlight.
- Table and figure extraction, and multi-document synthesis.

### Visual intelligence

- A UMAP projection of all my research as an interactive 2D constellation, HDBSCAN-clustered and auto-labelled.
- Analytics upgrades: topic-trend forecasting (time series), anomaly detection on unusual sessions (Isolation Forest), and a coverage heatmap over embedding space.

### Per-page ML, DL, and GenAI

- **Research:** a novelty score (how far a run pushes my knowledge frontier) and an NLI entailment check for real faithfulness.
- **Debate:** an argument-quality regressor trained on my rubric data, stance and contradiction detection via NLI, and a fallacy classifier.
- **Memory Bank:** semantic dedup and auto-merge of near-duplicate memories, and spaced-repetition resurfacing ranked by recency, centrality, and novelty.
- **Contradiction radar:** NLI across all my stored claims to surface where my own sources disagree across sessions.

The delivery order I'm committing to: credibility fixes, then graph ML, then GraphRAG. That trio is the biggest single jump from "a RAG demo" to "understands graph ML and retrieval systems."

---

## License

**Copyright 2024 to 2025 Ashwarya Pradhan. All rights reserved.**

This repository is source-available for learning and reference. Viewing it does not grant rights to use, copy, modify, distribute, or deploy any part of it, including source code, the agent pipeline design, prompts, database schemas, or documentation.

For licensing, pilots, or commercial use: **[pradhanashwarya2122@gmail.com](mailto:pradhanashwarya2122@gmail.com)**

---

<div align="center">

![Python](https://img.shields.io/badge/-Python-3b82f6?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/-LangGraph-22c55e?style=flat-square&logo=chainlink&logoColor=white)
![React](https://img.shields.io/badge/-React-06b6d4?style=flat-square&logo=react&logoColor=white)
![Claude](https://img.shields.io/badge/-Anthropic_Claude-d97706?style=flat-square&logo=anthropic&logoColor=white)
![Neo4j](https://img.shields.io/badge/-Neo4j-4581C3?style=flat-square&logo=neo4j&logoColor=white)
![Pinecone](https://img.shields.io/badge/-Pinecone-6366f1?style=flat-square&logo=databricks&logoColor=white)

**Built by Ashwarya Pradhan**

</div>
<!-- end of README -->
