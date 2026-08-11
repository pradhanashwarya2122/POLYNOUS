from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
import tempfile
import os
import shutil
from typing import Optional

from app.utils.pdf_security import validate_pdf_upload
from app.utils.sanitizer import sanitize_filename
from app.database import get_db
from app.models.user import User
from app.data_sources.pdf_processor import (
    process_pdf, get_progress, search_pdf, rag_answer_from_pdf, get_uploaded_pdfs,
)

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


def _resolve_user(req: Request, db: Session):
    """The authenticated User (or None for guests), from the auth middleware's
    request.state.user_public_id."""
    pub = getattr(req.state, "user_public_id", None)
    if not pub or pub in ("guest", "unknown"):
        return None
    return db.query(User).filter(User.public_id == pub).first()

# ============================================================
# CONFIGURATION
# ============================================================
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB maximum upload size
ALLOWED_EXTENSION = '.pdf'
ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/x-pdf',
    'application/octet-stream',  # Some browsers send this for PDFs
]

# ============================================================
# HELPERS
# ============================================================

def format_size(bytes_val: int) -> str:
    """Format bytes to human-readable string"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_val < 1024:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024
    return f"{bytes_val:.1f} TB"

# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), req: Request = None, db: Session = Depends(get_db)):
    """
    Upload and validate a PDF file.
    
    Security checks performed (in order):
    1. Filename validation & sanitization
    2. File extension check
    3. MIME type verification
    4. File size check (max 50 MB)
    5. Empty file detection
    6. PDF structure validation
    7. Malware scanning (via pdf_security module)
    8. Metadata extraction
    
    Returns:
        JSON with upload status, file details, and validation results
    """
    
    # ═══════════════════════════════════════════════════
    # STEP 1: Validate filename
    # ═══════════════════════════════════════════════════
    if not file.filename:
        raise HTTPException(
            status_code=400, 
            detail="No filename provided. Please select a file to upload."
        )
    
    # Sanitize filename (remove path traversal, special chars, etc.)
    safe_filename = sanitize_filename(file.filename)
    
    print(f"📄 Upload request: {safe_filename}")
    
    # ═══════════════════════════════════════════════════
    # STEP 2: Check file extension
    # ═══════════════════════════════════════════════════
    if not safe_filename.lower().endswith(ALLOWED_EXTENSION):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Only {ALLOWED_EXTENSION} files are allowed. "
                   f"Received: {safe_filename.split('.')[-1] if '.' in safe_filename else 'unknown'}"
        )
    
    # ═══════════════════════════════════════════════════
    # STEP 3: Verify MIME type (if provided by browser)
    # ═══════════════════════════════════════════════════
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        print(f"⚠️  Unexpected MIME type: {file.content_type}")
        # Don't reject — some browsers send generic MIME types
        # But log it for monitoring
    
    # ═══════════════════════════════════════════════════
    # STEP 4: Read file content into memory
    # ═══════════════════════════════════════════════════
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot read file: {str(e)}. The file may be corrupted."
        )
    
    # ═══════════════════════════════════════════════════
    # STEP 5: Check for empty file
    # ═══════════════════════════════════════════════════
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=400, 
            detail="File is empty. Please upload a valid PDF document."
        )
    
    # ═══════════════════════════════════════════════════
    # STEP 6: SIZE CHECK — Reject oversized files
    # ═══════════════════════════════════════════════════
    if len(content) > MAX_FILE_SIZE:
        actual_size = len(content)
        actual_size_str = format_size(actual_size)
        max_size_str = format_size(MAX_FILE_SIZE)
        
        print(f"❌ File too large: {actual_size_str} (max: {max_size_str})")
        
        raise HTTPException(
            status_code=400,
            detail={
                'message': f'File too large. Maximum allowed size is {max_size_str}.',
                'file_size': actual_size,
                'file_size_formatted': actual_size_str,
                'max_size': MAX_FILE_SIZE,
                'max_size_formatted': max_size_str,
            }
        )
    
    file_size_str = format_size(len(content))
    print(f"📏 File size: {file_size_str} ({len(content)} bytes)")
    
    # ═══════════════════════════════════════════════════
    # STEP 7: Save to temporary file for scanning
    # ═══════════════════════════════════════════════════
    temp_path = None
    temp_file = None
    
    try:
        # Create a temporary file
        temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
        temp_file = os.fdopen(temp_fd, 'wb')
        
        # Write content to temp file
        temp_file.write(content)
        temp_file.flush()
        os.fsync(temp_file.fileno())  # Ensure data is written to disk
        temp_file.close()
        temp_file = None
        
        print(f"📁 Temp file created: {temp_path}")
        
        # ═══════════════════════════════════════════════
        # STEP 8: Run security validation
        # ═══════════════════════════════════════════════
        print("🔍 Running security validation...")
        
        validation_result = validate_pdf_upload(temp_path, safe_filename)
        
        if not validation_result.get('valid', False):
            failed_checks = validation_result.get('checks_failed', [])
            print(f"❌ Validation failed: {failed_checks}")
            
            raise HTTPException(
                status_code=400,
                detail={
                    'message': validation_result.get('message', 'PDF validation failed'),
                    'failed_checks': failed_checks,
                    'warnings': validation_result.get('warnings', []),
                }
            )
        
        # ═══════════════════════════════════════════════
        # STEP 9: Validation passed — process the PDF
        # ═══════════════════════════════════════════════
        print("✅ PDF validation passed!")
        
        # Log warnings if any
        warnings = validation_result.get('warnings', [])
        if warnings:
            print(f"⚠️  Warnings: {warnings}")
        
        # ── PDF Processing ──────────────────────────
        # Extract text, chunk, embed with the user's own key, and store the
        # vectors in Pinecone (scoped to this user). Runs in a threadpool so the
        # /pdfs/progress polling stays responsive during the upload.
        user = _resolve_user(req, db) if req is not None else None
        if user is None:
            raise HTTPException(status_code=401, detail="Sign in to upload and index PDFs.")

        checks_passed = validation_result.get('checks_passed', [])
        result = await run_in_threadpool(process_pdf, temp_path, safe_filename, user)

        if result.get('status') == 'error':
            raise HTTPException(status_code=400, detail=result.get('message', 'PDF processing failed.'))

        return {
            'status': 'success',
            'filename': safe_filename,
            'original_filename': file.filename,
            'file_size': len(content),
            'file_size_formatted': file_size_str,
            'file_hash': result.get('file_hash', validation_result.get('file_hash', '')),
            'total_chunks': result.get('total_chunks', 0),
            'metadata': validation_result.get('metadata', {}),
            'warnings': warnings,
            'checks_passed': checks_passed,
            'checks_count': len(checks_passed),
            'message': result.get('message') or f"Indexed {result.get('total_chunks', 0)} chunks.",
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions (they're already formatted)
        raise
    
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Upload failed due to an internal error: {str(e)}"
        )
    
    finally:
        # ═══════════════════════════════════════════════
        # STEP 10: Clean up — always remove temp file
        # ═══════════════════════════════════════════════
        if temp_file:
            try:
                temp_file.close()
            except:
                pass
        
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                print(f"🧹 Temp file cleaned up: {temp_path}")
            except Exception as e:
                print(f"⚠️  Could not delete temp file {temp_path}: {e}")


@router.post("/upload-multiple")
async def upload_multiple_pdfs(files: list[UploadFile] = File(...)):
    """
    Upload multiple PDF files at once.
    Max 10 files per request, each max 50 MB.
    """
    MAX_FILES = 10
    
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Maximum {MAX_FILES} files per request."
        )
    
    results = []
    errors = []
    
    for file in files:
        try:
            # Reuse the single upload logic
            # For efficiency, you could call the upload_pdf function directly
            result = await upload_pdf(file)
            results.append(result)
        except HTTPException as e:
            errors.append({
                'filename': file.filename or 'unknown',
                'error': e.detail
            })
    
    return {
        'total': len(files),
        'successful': len(results),
        'failed': len(errors),
        'results': results,
        'errors': errors,
    }


@router.get("/validate/{filename}")
async def validate_filename(filename: str):
    """
    Quick filename validation endpoint.
    
    Useful for client-side pre-validation before upload.
    """
    safe_name = sanitize_filename(filename)
    
    return {
        'original': filename,
        'sanitized': safe_name,
        'valid': safe_name.lower().endswith('.pdf'),
        'max_size': MAX_FILE_SIZE,
        'max_size_formatted': format_size(MAX_FILE_SIZE),
    }


@router.get("/limits")
async def upload_limits():
    """
    Get current upload limits and restrictions.

    Useful for client-side validation before upload.
    """
    return {
        'max_file_size': MAX_FILE_SIZE,
        'max_file_size_formatted': format_size(MAX_FILE_SIZE),
        'allowed_extensions': [ALLOWED_EXTENSION],
        'allowed_mime_types': ALLOWED_MIME_TYPES,
        'max_files_per_batch': 10,
    }


# ============================================================
# PROCESSING / RETRIEVAL ENDPOINTS
# These back the PDF Lab UI (progress, list, ask, search). Previously missing,
# so every one of these calls 404'd and the page "always showed an error".
# ============================================================

@router.get("/progress")
async def pdf_progress(filename: str):
    """Live processing progress for an in-flight upload (polled by the UI)."""
    return get_progress(sanitize_filename(filename))


@router.get("/list")
async def list_pdfs(req: Request, db: Session = Depends(get_db)):
    """The signed-in user's indexed PDFs."""
    user = _resolve_user(req, db)
    if user is None:
        return {"pdfs": []}
    return {"pdfs": await run_in_threadpool(get_uploaded_pdfs, user)}


@router.post("/ask")
async def ask_pdf(query: str, req: Request, pdf_name: Optional[str] = None, db: Session = Depends(get_db)):
    """RAG answer grounded in the user's PDFs (optionally a specific one)."""
    query = (query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="A question is required.")
    user = _resolve_user(req, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in to ask about your PDFs.")
    result = await run_in_threadpool(rag_answer_from_pdf, query, pdf_name, 5, user)

    # Populate the knowledge graph from the PDF Q&A, tagged source='pdf' so these
    # concepts are visually distinguishable from research/debate ones in the graph.
    try:
        from app.knowledge_graph.graph_manager import kg
        ans = result.get("answer", "") if isinstance(result, dict) else ""
        if ans:
            provider = getattr(user, "preferred_provider", "anthropic") or "anthropic"
            await run_in_threadpool(
                kg.extract_and_link_triples, f"{query}\n{ans[:1600]}",
                user, provider, None, user.public_id, "pdf",
            )
    except Exception as e:
        print(f"⚠️ PDF KG extraction skipped: {e}")
    return result


@router.get("/search")
async def search_pdfs(query: str, req: Request, pdf_name: Optional[str] = None,
                      top_k: int = 5, db: Session = Depends(get_db)):
    """Semantic vector search over the user's PDF chunks (no LLM)."""
    query = (query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="A search query is required.")
    user = _resolve_user(req, db)
    if user is None:
        return {"results": []}
    chunks = await run_in_threadpool(search_pdf, query, pdf_name, top_k, user)
    return {"results": chunks}