import os
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
    """Split text into overlapping chunks"""
    chunks = []
    if not text:
        return chunks

    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap

    print(f"✅ Created {len(chunks)} chunks")
    return chunks

def process_pdf(file_path: str, pdf_name: str, user=None) -> Dict:
    """
    Complete PDF processing pipeline.
    `user` is the authenticated SQLAlchemy User object (for API keys).
    """
    file_key = pdf_name
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
            filter={"file_hash": file_hash}, include_metadata=True
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
    text = extract_text_from_pdf(file_path)
    if not text:
        upload_progress[file_key]['status'] = 'error'
        return {"status": "error", "message": "Could not extract text"}
    upload_progress[file_key]['extraction'] = 50

    upload_progress[file_key]['status'] = 'chunking'
    chunks = chunk_text(text)
    upload_progress[file_key]['chunking'] = 60

    if not chunks:
        return {"status": "error", "message": "Text too short for chunks"}

    upload_progress[file_key]['status'] = 'embedding'
    print("🔹 Creating embeddings (using user's own key)...")
    index = get_pdf_index()

    total_chunks = len(chunks)
    for i, chunk in enumerate(chunks):
        try:
            # ✅ Pass the user object so the correct API key is used
            embedding = create_embedding(user, chunk[:8000])
            if embedding:
                chunk_id = f"{file_hash}_{i}"
                index.upsert(vectors=[{
                    "id": chunk_id,
                    "values": embedding,
                    "metadata": {
                        "pdf_name": pdf_name,
                        "file_hash": file_hash,
                        "chunk_index": i,
                        "total_chunks": total_chunks,
                        "text": chunk[:2000],
                        "timestamp": time.time()
                    }
                }])

            progress = 60 + int(((i + 1) / total_chunks) * 40)
            upload_progress[file_key]['embedding'] = progress
            upload_progress[file_key]['storing'] = progress

        except Exception as e:
            print(f"⚠️ Chunk {i} error: {e}")

    upload_progress[file_key]['status'] = 'complete'
    upload_progress[file_key]['extraction'] = 100
    upload_progress[file_key]['chunking'] = 100
    upload_progress[file_key]['embedding'] = 100
    upload_progress[file_key]['storing'] = 100

    print(f"✅ Stored {total_chunks} chunks in Pinecone")
    return {
        "status": "success",
        "pdf_name": pdf_name,
        "file_hash": file_hash,
        "total_chunks": total_chunks,
        "total_characters": len(text),
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

        filter_dict = {}
        if pdf_name:
            filter_dict["pdf_name"] = pdf_name

        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            filter=filter_dict if filter_dict else None,
            include_metadata=True
        )

        chunks = []
        for match in results.get('matches', []):
            if match.score > 0.05:
                chunks.append({
                    "text": match.metadata.get('text', '')[:500],
                    "pdf_name": match.metadata.get('pdf_name', 'Unknown'),
                    "chunk_index": match.metadata.get('chunk_index', 0),
                    "score": round(match.score * 100, 1)
                })

        print(f"   Returned {len(chunks)} chunks (threshold: 0.05)")
        return chunks

    except Exception as e:
        print(f"❌ PDF search error: {e}")
        return []

def rag_answer_from_pdf(query: str, pdf_name: str = None, top_k: int = 5, user=None) -> Dict:
    """
    RAG: Search PDF + Generate structured answer using the user's own LLM key.
    `user` is the authenticated SQLAlchemy User object.
    """
    # Determine the user's provider and key
    provider, api_key = get_user_provider_and_key(user)

    chunks = search_pdf(query, pdf_name, top_k, user=user)

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
        context_parts.append(
            f"━━━ CHUNK {i} ({c['score']}% relevant) ━━━\n"
            f"Source: {c['pdf_name']}\n"
            f"Content: {c['text']}\n"
        )
    context = "\n".join(context_parts)

    system_prompt = """You are a precise research assistant answering questions from PDF documents.

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

        scores = [c['score'] for c in chunks]
        avg_score = sum(scores) / len(scores) if scores else 0
        max_score = max(scores) if scores else 0

        return {
            "answer": answer,
            "sources": [
                {
                    "pdf_name": c['pdf_name'],
                    "chunk_id": c['chunk_index'],
                    "chunk_index": c['chunk_index'],
                    "relevance": c['score'],
                    "text_preview": c['text'][:150] + "..."
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

def get_uploaded_pdfs() -> List[Dict]:
    try:
        index = get_pdf_index()
        results = index.query(
            vector=[0.0] * EMBEDDING_DIM,
            top_k=100,
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