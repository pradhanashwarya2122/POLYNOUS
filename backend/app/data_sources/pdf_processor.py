import os
import re
import math
import hashlib
import time
from typing import List, Dict, Optional
from PyPDF2 import PdfReader
from dotenv import load_dotenv

load_dotenv()

# ✅ Use centralised embedding function that requires (user, text)
from app.llm_client import create_embedding, ask_llm
from app.utils.key_resolver import get_user_provider_and_key

from pinecone import Pinecone

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

PDF_INDEX_NAME = "polynous-pdfs"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
EMBEDDING_DIM = 1536

upload_progress = {}

def get_pdf_index():
    """Get or create PDF‑specific Pinecone index with dimension validation"""
    try:
        index_list = pc.list_indexes()
        index_names = [idx.name for idx in index_list]

        if PDF_INDEX_NAME not in index_names:
            print(f"📦 Creating PDF index: {PDF_INDEX_NAME}")
            pc.create_index(
                name=PDF_INDEX_NAME,
                dimension=EMBEDDING_DIM,
                metric="cosine",
                spec={"serverless": {"cloud": "aws", "region": "us-east-1"}}
            )
            time.sleep(5)
            print(f"✅ PDF index created successfully")
        else:
            try:
                test_query = pc.Index(PDF_INDEX_NAME)
                test_query.query(
                    vector=[0.0] * EMBEDDING_DIM,
                    top_k=1,
                    include_metadata=False
                )
                print(f"✅ Index exists with correct dimension {EMBEDDING_DIM}")
                return test_query
            except Exception as dim_error:
                error_msg = str(dim_error).lower()
                if "dimension" in error_msg or "shape" in error_msg:
                    print(f"⚠️ Dimension mismatch detected! Recreating index...")
                    pc.delete_index(PDF_INDEX_NAME)
                    time.sleep(3)
                    pc.create_index(
                        name=PDF_INDEX_NAME,
                        dimension=EMBEDDING_DIM,
                        metric="cosine",
                        spec={"serverless": {"cloud": "aws", "region": "us-east-1"}}
                    )
                    time.sleep(5)
                    print(f"✅ Recreated index with correct dimension {EMBEDDING_DIM}")
                else:
                    raise dim_error

        return pc.Index(PDF_INDEX_NAME)

    except Exception as e:
        print(f"❌ Error accessing Pinecone: {e}")
        raise Exception(f"Unable to connect to Pinecone: {str(e)}")

def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file"""
    try:
        reader = PdfReader(file_path)
        text = ""
        total_pages = len(reader.pages)

        for i, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                progress = int(((i + 1) / total_pages) * 50)
                upload_progress['extraction'] = progress
            except Exception as e:
                print(f"⚠️ Error extracting page {i + 1}: {e}")
                continue

        print(f"✅ Extracted {len(text)} characters from {total_pages} pages")
        return text.strip()

    except Exception as e:
        print(f"❌ PDF extraction error: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Legacy fixed-size chunker (kept for compatibility)."""
    chunks = []
    if not text:
        return chunks
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


# ── Phase D: page-aware extraction + semantic chunking ────────────────────────

def extract_pages(file_path: str) -> List[Dict]:
    """Extract text per page so chunks can be page-anchored for citations."""
    pages = []
    try:
        reader = PdfReader(file_path)
        total = max(1, len(reader.pages))
        for i, page in enumerate(reader.pages):
            try:
                txt = page.extract_text() or ""
            except Exception:
                txt = ""
            pages.append({"page": i + 1, "text": txt})
            upload_progress_set_extraction(int(((i + 1) / total) * 50))
    except Exception as e:
        print(f"❌ PDF page extraction error: {e}")
    return pages


def upload_progress_set_extraction(pct: int):
    # helper so extract_pages can update the most-recent in-flight upload
    for key in list(upload_progress.keys()):
        if isinstance(upload_progress.get(key), dict) and upload_progress[key].get("status") == "extracting":
            upload_progress[key]["extraction"] = pct


def semantic_chunks(pages: List[Dict], target: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[Dict]:
    """Paragraph-aware chunking within each page. Splits on blank lines and packs
    paragraphs up to `target` chars (with a small overlap), so a chunk is a
    coherent idea rather than an arbitrary character cut. Each chunk keeps its
    source page number."""
    out = []
    for p in pages:
        text = (p.get("text") or "").strip()
        if not text:
            continue
        paras = [x.strip() for x in re.split(r"\n\s*\n", text) if x.strip()]
        if not paras:
            paras = [text]
        buf = ""
        for para in paras:
            # A very long paragraph is hard-split so no chunk blows past target.
            while len(para) > target:
                head, para = para[:target], para[target:]
                if buf:
                    out.append({"text": buf.strip(), "page": p["page"]}); buf = ""
                out.append({"text": head.strip(), "page": p["page"]})
            if buf and len(buf) + len(para) + 1 > target:
                out.append({"text": buf.strip(), "page": p["page"]})
                buf = (buf[-overlap:] + " " + para) if overlap else para
            else:
                buf = (buf + "\n" + para).strip() if buf else para
        if buf.strip():
            out.append({"text": buf.strip(), "page": p["page"]})
    print(f"✅ Created {len(out)} semantic chunks across {len(pages)} pages")
    return out

def process_pdf(file_path: str, pdf_name: str, user=None) -> Dict:
    """
    Complete PDF processing pipeline.
    `user` is the authenticated SQLAlchemy User object (for API keys).
    """
    file_key = pdf_name
    uid = getattr(user, 'public_id', None) or 'guest'
    upload_progress[file_key] = {
        'extraction': 0, 'chunking': 0, 'embedding': 0,
        'storing': 0, 'status': 'starting'
    }

    print(f"\n📄 Processing PDF: {pdf_name}")

    with open(file_path, 'rb') as f:
        file_hash = hashlib.md5(f.read()).hexdigest()

    try:
        index = get_pdf_index()
        existing = index.query(
            vector=[0.0] * EMBEDDING_DIM, top_k=1,
            filter={"file_hash": file_hash, "user_id": uid}, include_metadata=True
        )
        if existing.get('matches'):
            upload_progress[file_key] = {
                'extraction': 100, 'chunking': 100,
                'embedding': 100, 'storing': 100, 'status': 'complete'
            }
            return {
                "status": "already_exists",
                "message": "PDF already processed",
                "file_hash": file_hash,
                "progress": 100
            }
    except Exception as e:
        print(f"⚠️ Duplicate check error: {e}")

    upload_progress[file_key]['status'] = 'extracting'
    pages = extract_pages(file_path)
    if not any((p.get("text") or "").strip() for p in pages):
        upload_progress[file_key]['status'] = 'error'
        return {"status": "error", "message": "Could not extract text from this PDF."}
    upload_progress[file_key]['extraction'] = 50

    upload_progress[file_key]['status'] = 'chunking'
    chunks = semantic_chunks(pages)          # [{text, page}]
    upload_progress[file_key]['chunking'] = 60

    if not chunks:
        return {"status": "error", "message": "Text too short for chunks"}

    upload_progress[file_key]['status'] = 'embedding'
    print("🔹 Creating embeddings (using user's own key)...")
    index = get_pdf_index()

    total_chunks = len(chunks)
    total_chars = sum(len(c["text"]) for c in chunks)
    stored = 0
    for i, chunk in enumerate(chunks):
        try:
            embedding = create_embedding(user, chunk["text"][:8000])
            if embedding:
                chunk_id = f"{uid}_{file_hash}_{i}"
                index.upsert(vectors=[{
                    "id": chunk_id,
                    "values": embedding,
                    "metadata": {
                        "pdf_name": pdf_name,
                        "file_hash": file_hash,
                        "user_id": uid,
                        "chunk_index": i,
                        "page": chunk["page"],
                        "total_chunks": total_chunks,
                        "text": chunk["text"][:2000],
                        "timestamp": time.time()
                    }
                }])
                stored += 1

            progress = 60 + int(((i + 1) / total_chunks) * 40)
            upload_progress[file_key]['embedding'] = progress
            upload_progress[file_key]['storing'] = progress

        except Exception as e:
            print(f"⚠️ Chunk {i} error: {e}")

    # If nothing embedded, the user almost certainly has no valid OpenAI key.
    if stored == 0:
        upload_progress[file_key]['status'] = 'error'
        return {"status": "error",
                "message": "Could not embed this PDF. Add a valid OpenAI API key in Settings, then try again."}

    upload_progress[file_key]['status'] = 'complete'
    upload_progress[file_key]['extraction'] = 100
    upload_progress[file_key]['chunking'] = 100
    upload_progress[file_key]['embedding'] = 100
    upload_progress[file_key]['storing'] = 100

    print(f"✅ Stored {stored}/{total_chunks} chunks in Pinecone")
    return {
        "status": "success",
        "pdf_name": pdf_name,
        "file_hash": file_hash,
        "total_chunks": stored,
        "total_characters": total_chars,
        "progress": 100
    }

def get_progress(file_key: str) -> Dict:
    return upload_progress.get(file_key, {
        'extraction': 0, 'chunking': 0,
        'embedding': 0, 'storing': 0, 'status': 'unknown'
    })

def search_pdf(query: str, pdf_name: str = None, top_k: int = 5, user=None) -> List[Dict]:
    """
    Semantic search across PDF chunks.
    `user` is required for the embedding call.
    """
    try:
        index = get_pdf_index()
        # ✅ Use the user object for embedding
        query_embedding = create_embedding(user, query)
        if not query_embedding:
            print("❌ Failed to create query embedding")
            return []

        # Scope every search to the requesting user so PDFs never leak across
        # accounts.
        uid = getattr(user, 'public_id', None) or 'guest'
        filter_dict = {"user_id": uid}
        if pdf_name:
            filter_dict["pdf_name"] = pdf_name

        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            filter=filter_dict,
            include_metadata=True
        )

        chunks = []
        for match in results.get('matches', []):
            if match.score > 0.05:
                md = match.metadata or {}
                chunks.append({
                    "id": match.id,
                    "text": md.get('text', ''),
                    "pdf_name": md.get('pdf_name', 'Unknown'),
                    "chunk_index": md.get('chunk_index', 0),
                    "page": int(md.get('page', 0) or 0),
                    "score": round(match.score * 100, 1)
                })

        print(f"   Returned {len(chunks)} chunks (threshold: 0.05)")
        return chunks

    except Exception as e:
        print(f"❌ PDF search error: {e}")
        return []


# ── Phase D: hybrid retrieval (dense + BM25 + RRF) with LLM reranking ─────────

def _fetch_corpus(pdf_name: str = None, user=None, cap: int = 600) -> List[Dict]:
    """All of the user's chunk texts (optionally for one PDF) for lexical BM25."""
    try:
        index = get_pdf_index()
        uid = getattr(user, 'public_id', None) or 'guest'
        flt = {"user_id": uid}
        if pdf_name:
            flt["pdf_name"] = pdf_name
        res = index.query(vector=[0.0] * EMBEDDING_DIM, top_k=cap, filter=flt, include_metadata=True)
        docs = []
        for m in res.get('matches', []):
            md = m.metadata or {}
            docs.append({"id": m.id, "text": md.get('text', ''), "pdf_name": md.get('pdf_name', 'Unknown'),
                         "chunk_index": md.get('chunk_index', 0), "page": int(md.get('page', 0) or 0)})
        return docs
    except Exception as e:
        print(f"⚠️ corpus fetch failed: {e}")
        return []


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", (text or "").lower())


def _bm25_rank(query: str, docs: List[Dict], k1: float = 1.5, b: float = 0.75) -> List[tuple]:
    """Pure-Python BM25. Returns [(doc_index, score)] sorted desc."""
    if not docs:
        return []
    corpus = [_tokenize(d["text"]) for d in docs]
    N = len(corpus)
    avgdl = sum(len(c) for c in corpus) / N if N else 0
    df = {}
    for c in corpus:
        for term in set(c):
            df[term] = df.get(term, 0) + 1
    idf = {t: math.log(1 + (N - n + 0.5) / (n + 0.5)) for t, n in df.items()}
    q = _tokenize(query)
    scores = []
    for i, c in enumerate(corpus):
        if not c:
            scores.append((i, 0.0)); continue
        freq = {}
        for term in c:
            freq[term] = freq.get(term, 0) + 1
        dl = len(c)
        s = 0.0
        for term in q:
            if term not in freq:
                continue
            f = freq[term]
            s += idf.get(term, 0.0) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avgdl))
        scores.append((i, s))
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores


def hybrid_retrieve(query: str, pdf_name: str = None, user=None, top_k: int = 12) -> List[Dict]:
    """Dense (Pinecone cosine) + lexical (BM25) retrieval fused with Reciprocal
    Rank Fusion. Surfaces both semantically-similar and exact-keyword chunks."""
    dense = search_pdf(query, pdf_name, top_k=20, user=user)          # [{id,text,page,score}]
    corpus = _fetch_corpus(pdf_name, user=user)
    bm25 = _bm25_rank(query, corpus)[:20] if corpus else []

    RRF_K = 60
    fused = {}   # id -> {doc, rrf}
    for rank, d in enumerate(dense):
        fused.setdefault(d["id"], {"doc": d, "rrf": 0.0})
        fused[d["id"]]["rrf"] += 1.0 / (RRF_K + rank)
    for rank, (idx, _s) in enumerate(bm25):
        d = corpus[idx]
        node = fused.setdefault(d["id"], {"doc": d, "rrf": 0.0})
        node["rrf"] += 1.0 / (RRF_K + rank)
        # prefer the dense copy's cosine score if we already have it
        node["doc"].setdefault("score", 0.0)

    ranked = sorted(fused.values(), key=lambda x: x["rrf"], reverse=True)[:top_k]
    out = []
    for r in ranked:
        d = dict(r["doc"])
        d["fusion"] = round(r["rrf"], 4)
        out.append(d)
    return out


def _llm_rerank(query: str, candidates: List[Dict], user=None, provider: str = "anthropic",
                top_n: int = 6) -> List[Dict]:
    """Ask the LLM to score each candidate's relevance to the query and keep the
    best `top_n`. Best-effort: falls back to the fused order on any failure."""
    if len(candidates) <= top_n:
        return candidates
    try:
        from app.llm_client import ask_llm
        import json as _json
        listing = "\n".join(f"[{i}] {c['text'][:300]}" for i, c in enumerate(candidates))
        system = ("Score how well each passage answers the question, 0-10. "
                  "Return ONLY a JSON array of {\"i\": index, \"s\": score}. No prose.")
        raw = ask_llm(user=user, provider=provider, system_prompt=system,
                      messages=[{"role": "user", "content": f"QUESTION: {query}\n\nPASSAGES:\n{listing}"}],
                      max_tokens=400, temperature=0.0)
        m = re.search(r"\[.*\]", raw or "", re.DOTALL)
        scored = _json.loads(m.group(0)) if m else []
        order = {int(x["i"]): float(x["s"]) for x in scored if "i" in x}
        ranked = sorted(range(len(candidates)), key=lambda i: order.get(i, -1), reverse=True)
        return [candidates[i] for i in ranked[:top_n]]
    except Exception as e:
        print(f"⚠️ LLM rerank skipped: {e}")
        return candidates[:top_n]

def rag_answer_from_pdf(query: str, pdf_name: str = None, top_k: int = 5, user=None) -> Dict:
    """
    RAG: Search PDF + Generate structured answer using the user's own LLM key.
    `user` is the authenticated SQLAlchemy User object.
    """
    # Determine the user's provider and key
    provider, api_key = get_user_provider_and_key(user)

    # Phase D production retrieval: hybrid dense+BM25 (RRF), then LLM rerank.
    fused = hybrid_retrieve(query, pdf_name, user=user, top_k=12)
    chunks = _llm_rerank(query, fused, user=user, provider=provider, top_n=top_k)

    if not chunks:
        return {
            "answer": "📋 **No relevant information found** in the uploaded PDFs.\n\n"
                      "Try:\n- Uploading relevant documents\n"
                      "- Rephrasing your question\n"
                      "- Selecting a specific PDF from your library",
            "sources": [],
            "confidence": 0
        }

    context_parts = []
    for i, c in enumerate(chunks, 1):
        pg = f"p. {c['page']}" if c.get('page') else "p. ?"
        context_parts.append(
            f"━━━ CHUNK {i} [{c['pdf_name']}, {pg}] ━━━\n"
            f"Content: {c['text']}\n"
        )
    context = "\n".join(context_parts)

    system_prompt = """You are a precise research assistant answering questions from PDF documents.
Cite the page you used inline as [p. N] (from the chunk headers) after each claim.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

📋 ANSWER
[Direct, clear answer to the question. Be specific — include names, dates, numbers.]

🔑 KEY DETAILS
• [Specific detail from the document with context]
• [Another relevant detail with context]
• [Additional finding if available]

📊 SOURCE COVERAGE
[How well the documents answered the question — e.g., "Found in 3 of 5 chunks"]

⚠️ LIMITATIONS (if any)
[What the documents don't tell us or any gaps]

RULES:
- Use ONLY the provided context
- Include actual names, numbers, dates from the text
- If context partially answers, say what's known and what's missing
- Keep it concise but complete
- Always cite which chunks you used"""

    user_message = f"""PDF DOCUMENT CONTEXT:
{context[:6000]}

USER QUESTION: {query}

Provide a structured answer following the format above. Only use information from the provided context."""

    try:
        # ✅ Use ask_llm with the user object – no hardcoded key
        answer = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=800,
            temperature=0.3
        )

        scores = [c.get('score', 0) or 0 for c in chunks]
        avg_score = sum(scores) / len(scores) if scores else 0
        max_score = max(scores) if scores else 0

        return {
            "answer": answer,
            "sources": [
                {
                    "pdf_name": c['pdf_name'],
                    "chunk_id": c.get('chunk_index', 0),
                    "chunk_index": c.get('chunk_index', 0),
                    "page": c.get('page', 0),
                    "relevance": c.get('score', 0) or 0,
                    "text_preview": (c.get('text', '')[:150] + "...")
                }
                for c in chunks
            ],
            "confidence": round(avg_score, 1),
            "max_relevance": round(max_score, 1),
            "chunks_found": len(chunks)
        }
    except Exception as e:
        return {
            "answer": f"❌ Error generating answer: {str(e)}",
            "sources": [],
            "confidence": 0
        }

def get_uploaded_pdfs(user=None) -> List[Dict]:
    try:
        index = get_pdf_index()
        uid = getattr(user, 'public_id', None) or 'guest'
        results = index.query(
            vector=[0.0] * EMBEDDING_DIM,
            top_k=1000,
            filter={"user_id": uid},
            include_metadata=True
        )
        pdfs = {}
        for match in results.get('matches', []):
            name = match.metadata.get('pdf_name', 'Unknown')
            if name not in pdfs:
                pdfs[name] = {
                    "pdf_name": name,
                    "total_chunks": match.metadata.get('total_chunks', 0)
                }
        return list(pdfs.values())
    except:
        return []