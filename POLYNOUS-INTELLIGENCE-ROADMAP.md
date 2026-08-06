# POLYNOUS — Intelligence Audit & ML/DL/GenAI Roadmap

> Goal: move from "storing knowledge as nodes" to **provably doing math, ML, DL and GenAI** on that knowledge — with concrete, interview-ready features that differentiate POLYNOUS from every other RAG/graph demo.

---

## PART 1 — HONEST AUDIT (what's real vs. heuristic today)

| Module | What's real | What's heuristic / weak | Interviewer risk |
|--------|-------------|--------------------------|------------------|
| **Semantic Search** | Real OpenAI `text-embedding-3-small` (1536-d) + Pinecone **cosine** search, user-namespaced | Keyword fallback; no reranking; no clustering; single-vector, no query expansion | Low — but "just cosine top-k" is table-stakes |
| **PDF Lab (RAG)** | Real embeddings + Pinecone; overlap chunking; progress pipeline | **Fixed 1000-char chunks** (breaks mid-sentence); naive top-k; **no reranker**; no page/coordinate citations; no tables/figures; single-doc only | Medium — "basic RAG" |
| **Knowledge Graph** | Neo4j nodes/edges; real Cypher multi-hop path queries | **Regex NER** (capitalized words); **hardcoded edge scores** (`85.0`, `90-hops*10`); `hybrid_search.py` uses a **fake MD5-hash pseudo-embedding**; **no graph algorithms at all** | **High** — this is "a database with a d3 view," not graph ML |

### The three things to fix first (credibility)
1. **Kill the fake embedding** in `hybrid_search.py` (MD5 bag-of-words) → route through the real `create_embedding`.
2. **Replace regex NER** with LLM triple-extraction (subject–relation–object) or spaCy NER → real entities + typed relations.
3. **Replace hardcoded scores** with computed graph metrics (see GDS below).

---

## PART 2 — THE DIFFERENTIATORS (unique, concrete, defensible)

These are the "why is this different from a LangChain tutorial" features. Each lists the **algorithm**, the **data it runs on**, and **feasibility** on your current infra (Neo4j + Pinecone + Render CPU, BYOK).

### 🧠 Knowledge Graph → real Graph ML (Neo4j GDS — no GPU needed)
Neo4j Graph Data Science runs these **inside Neo4j** on CPU. This single library turns your KG from storage into science.

1. **Concept Influence (PageRank)** — rank which concepts are load-bearing in *your* knowledge. Node size = PageRank. "Machine Learning is your most central concept (0.087), bridging 14 sub-topics."
2. **Bridge Concepts (Betweenness Centrality)** — find the ideas that connect otherwise-separate clusters. These are your "insight hotspots."
3. **Auto-Topics (Louvain / Leiden community detection)** — your graph self-organizes into communities; label each community with an LLM ("Cluster 3 = 'Reinforcement Learning safety'"). Color the graph by community.
4. **Link Prediction (Adamic-Adar + node2vec)** — "You've researched *X* and *Y* separately; the graph predicts they're related (score 0.72). Explore the connection?" A recommendation engine **over your own mind**.
5. **node2vec graph embeddings** — embed nodes by *structure*, then "find concepts structurally similar to this one" (different from semantic similarity — this is topological).
6. **Node Similarity (Jaccard/cosine over neighborhoods)** — replaces the hardcoded edge weights with a **computed** similarity.
7. **Shortest-path "reasoning chains"** (already have paths) → upgrade to **weighted** paths using the computed similarities, and narrate the chain with an LLM.

### 🕸️ GraphRAG — the headline feature
Instead of plain vector RAG, answer a question by (a) embedding it, (b) finding entry nodes, (c) **expanding a multi-hop subgraph**, (d) feeding that *structured subgraph* to the LLM, and (e) **showing the exact reasoning path** used. This is the 2024–2025 frontier (Microsoft GraphRAG) and almost no student project ships it. It uses your Neo4j graph + embeddings + LLM together — the perfect "I combined graph + vectors + generation" story.

### 📄 PDF Lab → research-grade RAG
1. **Semantic chunking** — split on embedding-similarity boundaries (not fixed chars), so chunks are coherent ideas. (Compute cosine between sliding sentence windows; cut at local minima.)
2. **Two-stage retrieval + Cross-Encoder rerank** — retrieve top-30 by cosine, then rerank with a cross-encoder (Cohere/Voyage rerank API via BYOK, or `ms-marco-MiniLM` on CPU) → precision jumps. "Bi-encoder recall, cross-encoder precision."
3. **Hybrid retrieval (BM25 + dense) with Reciprocal Rank Fusion** — lexical + semantic. Standard in serious systems, rare in demos.
4. **Page-anchored citations** — store `page` + char span per chunk; answers cite `[p. 12]` and clicking scrolls the PDF to the highlight.
5. **Table & figure extraction** (`pdfplumber`/`camelot`) → ask questions about tabular data.
6. **Multi-document synthesis** — ask across several PDFs; show which doc each claim came from.
7. **Auto-generated document map** — cluster a PDF's chunks (KMeans on embeddings) → a navigable "concept outline" of the doc.

### 🔎 Semantic Search → a semantic *map*, not a list
1. **UMAP 2D projection** of all your research embeddings → an interactive **constellation** of your knowledge; pan/zoom, colored by Louvain community.
2. **HDBSCAN clustering** → auto-themes with LLM labels + a "you have a knowledge gap between cluster A and B" callout.
3. **Cross-encoder rerank** on results (same as PDF).
4. **Maximal Marginal Relevance (MMR)** → diverse, non-redundant results.
5. **Query intent classifier** (logistic regression / small model on embeddings) → route "definition" vs "comparison" vs "how-to" queries differently.

---

## PART 3 — ML/DL/GenAI ON EVERY PAGE (the matrix you asked for)

| Page | Concrete ML/DL/GenAI feature | Technique | Feasible now? |
|------|------------------------------|-----------|---------------|
| **Research** | **Novelty score** per run — how much this expands your knowledge frontier (distance from existing embeddings) | Embedding distance + convex-hull/coverage | ✅ CPU |
| **Research** | **Claim-grounding classifier** — NLI (entailment) between each sentence and its source, real "faithfulness" | Cross-encoder NLI (`nli-deberta`/API) | ✅ (API) |
| **Research** | **Auto-difficulty & reading-level** of the answer | textstat + classifier | ✅ CPU |
| **Debate** | **Argument-quality regressor** trained on your rubric data → predicts scores before the judge (show as "model vs judge") | sklearn GBM on features | ✅ CPU |
| **Debate** | **Stance/NLI detection** — verify each rebuttal actually contradicts the opponent (entailment/contradiction) | NLI model | ✅ (API) |
| **Debate** | **Fallacy detector** — classify logical fallacies in arguments | LLM few-shot classifier | ✅ GenAI |
| **Knowledge Graph** | PageRank / Betweenness / Louvain / Link-Prediction / node2vec (Part 2) | **Neo4j GDS** | ✅ no GPU |
| **Knowledge Graph** | **GraphRAG** multi-hop reasoning | graph + vectors + LLM | ✅ |
| **Knowledge Graph** | **Contradiction radar** — NLI across all stored claims to surface cross-session conflicts | embeddings + NLI | ✅ |
| **Semantic Search** | UMAP map + HDBSCAN clusters + MMR + rerank (Part 2) | umap-learn, hdbscan, sklearn | ✅ CPU |
| **Analytics / Dashboard** | **Topic-trend forecasting** — predict your next research themes | time-series (Prophet/ARIMA) on topic counts | ✅ CPU |
| **Analytics / Dashboard** | **Anomaly/novelty detection** — flag unusual research sessions | Isolation Forest on run features | ✅ CPU |
| **Analytics / Dashboard** | **Knowledge coverage heatmap** over embedding space + "forgetting curve" | KDE / clustering over time | ✅ CPU |
| **Memory Bank** | **Semantic dedup + auto-merge** near-duplicate memories | cosine threshold + union-find | ✅ CPU |
| **Memory Bank** | **Spaced-repetition resurfacing** — ML-ranked "revisit this" (recency × centrality × novelty) | learned ranking | ✅ CPU |
| **Memory Bank** | **Auto-tagging / zero-shot classification** of each memory into your taxonomy | zero-shot LLM / embedding-kNN | ✅ |

---

## PART 4 — PRIORITIZED ROADMAP

**Phase A — Credibility fixes (fast, high trust):**
- A1 Replace fake hash embedding in `hybrid_search.py` with real `create_embedding`.
- A2 LLM triple-extraction (S–R–O) to build real typed entities/relations; keep regex as fallback.
- A3 Computed edge weights (Node Similarity) instead of hardcoded scores.

**Phase B — Graph ML foundation (the "wow"):**
- B1 Install Neo4j GDS; project the user graph.
- B2 PageRank + Betweenness → node sizing/coloring in the 3D/2D graph UI.
- B3 Louvain communities → colored clusters + LLM auto-labels.
- B4 Link prediction (Adamic-Adar → node2vec) → "suggested connections" panel.

**Phase C — GraphRAG:**
- C1 Subgraph retrieval endpoint (entry nodes → k-hop expansion).
- C2 LLM reasoning over subgraph with visible path + citations.

**Phase D — Retrieval quality (PDF + Search):**
- D1 Semantic chunking; D2 Cross-encoder rerank; D3 BM25+dense RRF; D4 page-anchored citations; D5 tables/figures.

**Phase E — Visual intelligence:**
- E1 UMAP constellation + HDBSCAN clusters (Semantic Search).
- E2 Analytics: trend forecast, anomaly detection, coverage heatmap.

**Phase F — Per-page classifiers/GenAI:**
- F1 Novelty score; F2 NLI faithfulness/contradiction; F3 argument-quality regressor; F4 fallacy detector; F5 memory dedup + spaced repetition.

---

## PART 5 — STACK ADDITIONS (all Render-CPU / API-friendly, no GPU required)

- **Neo4j GDS** (graph algorithms, node2vec, link prediction) — runs in the DB.
- **scikit-learn** (KMeans, IsolationForest, LogisticRegression, GBM), **umap-learn**, **hdbscan**.
- **Reranking**: Cohere Rerank / Voyage Rerank (BYOK) or `sentence-transformers` cross-encoder (CPU, small).
- **NLI**: hosted API or `cross-encoder/nli-deberta-v3-small` (CPU).
- **rank-bm25** (lexical), **pdfplumber/camelot** (tables), **textstat** (readability), **prophet** (forecasting).
- Heavy DL (GNN via PyTorch Geometric) = optional "trained offline, served as scores" story if you want a true deep-learning bullet; node2vec (GDS) already gives you a legitimate representation-learning line without GPU.

---

## PART 6 — INTERVIEW TALKING POINTS (what each unlocks)

- "I don't just store a graph — I run **PageRank, betweenness, and Louvain** on it to find load-bearing and bridge concepts, and **node2vec + Adamic-Adar link prediction** to recommend unseen connections."
- "My RAG is **two-stage** — bi-encoder recall, **cross-encoder rerank** — with **semantic chunking** and **page-anchored citations**, plus **BM25+dense RRF** hybrid retrieval."
- "I implemented **GraphRAG**: questions are answered over a retrieved **multi-hop subgraph**, and the UI shows the exact reasoning path."
- "Faithfulness isn't vibes — it's an **NLI entailment classifier** between each claim and its source; contradictions across sessions are surfaced by a **contradiction radar**."
- "The analytics page **forecasts** your next topics (time-series) and flags **anomalous** sessions (Isolation Forest); the search page is a **UMAP constellation** clustered by **HDBSCAN**."

> Recommendation: do **Phase A + B + C** first. That trio (real entities, graph algorithms, GraphRAG) is the single biggest jump from "student RAG demo" to "this person understands graph ML and retrieval systems."
