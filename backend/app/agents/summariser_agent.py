import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Literal, Optional
 
from dotenv import load_dotenv
 
load_dotenv()
 
# ============================================================
# CONFIG
# ============================================================
 
MAX_WORKERS       = int(os.getenv("SUMMARISER_MAX_WORKERS", "6"))
MAX_TOKENS        = int(os.getenv("SUMMARISER_MAX_TOKENS", "500"))
CONTENT_CHARS     = int(os.getenv("SUMMARISER_CONTENT_CHARS", "6000"))  # ~1500 tok
QUIET             = os.getenv("SUMMARISER_QUIET", "0") == "1"
MAX_RETRIES       = int(os.getenv("SUMMARISER_MAX_RETRIES", "3"))
RETRY_BASE_DELAY  = float(os.getenv("SUMMARISER_RETRY_BASE_DELAY", "1.0"))
 
Provider = Literal["anthropic", "openai", "openai_compatible"]
 
# Default fast/cheap models per provider — override via env vars
DEFAULT_MODELS: dict[str, str] = {
    "anthropic":        os.getenv("ANTHROPIC_SUMMARISER_MODEL", "claude-haiku-4-5"),
    "openai":           os.getenv("OPENAI_SUMMARISER_MODEL",    "gpt-4o-mini"),
    "openai_compatible": os.getenv("COMPAT_SUMMARISER_MODEL",   "gpt-4o-mini"),
}
 
logging.basicConfig(
    level=logging.WARNING if QUIET else logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("summariser")
 
# ============================================================
# CLIENT FACTORY
# ============================================================
 
@lru_cache(maxsize=16)
def _get_client(provider: str, api_key: Optional[str], base_url: Optional[str]) -> Any:
    """
    Return a cached API client.
    Cached so we don't reconstruct connection pools on every call.
    """
    # SECURITY: no implicit env-var fallback — the endpoint layer resolves
    # keys explicitly. Missing key = hard error, never a silent system charge.
    if not api_key:
        raise ValueError(f"No {provider} API key provided for this request.")
    if provider == "openai" or provider == "openai_compatible":
        from openai import OpenAI
        kwargs: dict[str, Any] = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        return OpenAI(**kwargs)

    from anthropic import Anthropic
    return Anthropic(api_key=api_key)
 
 
def get_client(
    provider: str = "anthropic",
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> tuple[Any, str]:
    """Public factory — returns (client, provider) pair. Drop-in for original."""
    return _get_client(provider, api_key, base_url), provider
 
 
# ============================================================
# RESULT MODEL
# ============================================================
 
@dataclass
class SummaryResult:
    index: int
    title: str
    url: str
    source_type: str      # "scraped" | "snippet" | "minimal"
    summary: str = ""
    model_used: str = ""
    provider: str = ""
    error: Optional[str] = None
 
    @property
    def succeeded(self) -> bool:
        return self.error is None and bool(self.summary)
 
    def to_prompt_string(self) -> str:
        """Flat string format — matches original output shape for downstream compat."""
        type_label = "FULL ARTICLE" if self.source_type == "scraped" else "SEARCH SNIPPET"
        if self.error:
            return (
                f"SOURCE {self.index}: {self.title}\n"
                f"URL: {self.url}\n"
                f"TYPE: {type_label}\n"
                f"Error: {self.error}"
            )
        return (
            f"SOURCE {self.index}: {self.title}\n"
            f"URL: {self.url}\n"
            f"TYPE: {type_label}\n"
            f"{self.summary}"
        )
 
    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "title": self.title,
            "url": self.url,
            "source_type": self.source_type,
            "summary": self.summary,
            "model_used": self.model_used,
            "provider": self.provider,
            "error": self.error,
        }
 
 
# ============================================================
# PROMPT
# ============================================================
 
_SYSTEM_PROMPT = """\
You extract what a source says — NOT what you think about the topic.
For each document, provide:
1. MAIN CLAIM: The primary argument (1 sentence, be specific)
2. SUPPORTING EVIDENCE: Key facts, data, or examples the source uses
3. PERSPECTIVE: What angle or viewpoint does this source represent?
4. TYPE: Is this news, academic, opinion, blog, government, or commercial?
5. DIRECT QUOTE: One notable quote from the source (if available)
6. RELEVANCE TO QUERY: What this source specifically says about the user's
   research question (if the source doesn't address it, say so plainly)

Be specific. Include numbers and names. Never inject your own opinion.
Prioritise the parts of the document that bear on the research question.\
"""


def _build_user_prompt(title: str, url: str, type_note: str, content: str,
                       query: str = "") -> str:
    query_line = f"RESEARCH QUESTION: {query}\n\n" if query else ""
    return (
        f"{query_line}"
        f"Title: {title}\n"
        f"URL: {url}\n"
        f"Content Type: {type_note}\n\n"
        f"Content:\n{content}\n\n"
        f"Extract what this source says (focused on the research question):"
    )
 
 
# ============================================================
# CORE: SUMMARISE ONE DOCUMENT
# ============================================================
 
def _token_aware_trim(text: str, max_chars: int = CONTENT_CHARS) -> str:
    """
    Trim content to max_chars at a sentence boundary where possible.
    Keeps more context than the original 3000-char hard cut.
    """
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    last_period = max(cut.rfind(". "), cut.rfind(".\n"))
    if last_period > max_chars * 0.6:
        return cut[: last_period + 1].strip()
    return cut.strip()
 
 
def _call_with_retry(
    fn,
    *args,
    max_retries: int = MAX_RETRIES,
    base_delay: float = RETRY_BASE_DELAY,
    **kwargs,
) -> Any:
    """
    Call fn(*args, **kwargs) with exponential backoff on rate-limit / server errors.
    Raises the last exception if all retries are exhausted.
    """
    retryable = (429, 500, 502, 503, 504)
    for attempt in range(max_retries):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            status = getattr(e, "status_code", None) or getattr(
                getattr(e, "response", None), "status_code", None
            )
            is_retryable = (
                status in retryable
                or "rate" in str(e).lower()
                or "overloaded" in str(e).lower()
                or "timeout" in str(e).lower()
            )
            if not is_retryable or attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            logger.warning("Retry %d/%d after %.1fs (%s)", attempt + 1, max_retries, delay, e)
            time.sleep(delay)
 
 
def _summarise_one(
    index: int,
    doc: dict,
    provider: str,
    api_key: Optional[str],
    model: Optional[str],
    base_url: Optional[str],
    query: str = "",
) -> SummaryResult:
    title       = doc.get("title", "Untitled")
    url         = doc.get("url", "")
    source_type = doc.get("content_source", "snippet")
    raw_content = doc.get("content", "")
    type_note   = "FULL ARTICLE" if source_type == "scraped" else "SEARCH SNIPPET"
    content     = _token_aware_trim(raw_content)
 
    result = SummaryResult(
        index=index,
        title=title,
        url=url,
        source_type=source_type,
        provider=provider,
    )
 
    try:
        client, ptype = get_client(provider, api_key, base_url)
        chosen_model  = model or DEFAULT_MODELS.get(ptype, DEFAULT_MODELS["anthropic"])
        result.model_used = chosen_model
 
        user_prompt = _build_user_prompt(title, url, type_note, content, query)
 
        if ptype in ("openai", "openai_compatible"):
            def _call():
                return client.chat.completions.create(
                    model=chosen_model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user",   "content": user_prompt},
                    ],
                    temperature=0.2,
                    max_tokens=MAX_TOKENS,
                )
            response = _call_with_retry(_call)
            result.summary = response.choices[0].message.content.strip()
 
        else:  # anthropic
            def _call():
                return client.messages.create(
                    model=chosen_model,
                    max_tokens=MAX_TOKENS,
                    temperature=0.2,
                    system=_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_prompt}],
                )
            response = _call_with_retry(_call)
            result.summary = response.content[0].text.strip()
 
    except Exception as e:
        result.error = str(e)[:200]
        logger.error("Source %d failed: %s", index, result.error)
 
    return result
 
 
# ============================================================
# PUBLIC API
# ============================================================
 
def summariser_agent(
    documents: list[dict],
    query: str = "",
    provider: str = "anthropic",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    progress_cb=None,
) -> list[str]:
    """
    Summarise each document — extract what the source ACTUALLY says.
    No opinion, no synthesis — just extraction.
 
    Args:
        documents:  List of dicts from search_web() / SourceResult.to_dict()
        query:      Original user query (reserved for future query-focused extraction)
        provider:   "anthropic" | "openai" | "openai_compatible"
        api_key:    Optional API key override (falls back to env vars)
        model:      Optional model name override (falls back to DEFAULT_MODELS)
        base_url:   Optional base URL for openai-compatible endpoints (e.g. Groq, Together)
 
    Returns:
        List of formatted strings — same shape as original for downstream compatibility.
        Access structured data via summarise_all() instead.
    """
    if not documents:
        return []
 
    results: list[SummaryResult] = [None] * len(documents)  # type: ignore
 
    logger.info("Summarising %d sources via %s ...", len(documents), provider)
 
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(documents))) as pool:
        futures = {
            pool.submit(
                _summarise_one,
                i, doc, provider, api_key, model, base_url, query,
            ): i - 1
            for i, doc in enumerate(documents, 1)
        }
        emit = progress_cb or (lambda msg, patch=None: None)
        done = 0
        total = len(documents)
        for future in as_completed(futures):
            slot = futures[future]
            result = future.result()
            results[slot] = result
            done += 1
            if result.succeeded:
                logger.info("  ✓ [%d] %s", result.index, result.title[:60])
                emit(
                    f"Summarised '{(result.title or 'Untitled')[:45]}' — {done}/{total}",
                    {
                        "agents": {"Summarise": {
                            "progress": round(10 + 85 * done / total),
                            "phase": {"label": "Summarising", "sub": f"{done}/{total} documents"},
                            "stats": [["Documents", f"{done}/{total}"]],
                        }},
                        "lanes": {"Summarise": {"sub": f"{done}/{total} condensed", "status": "working"}},
                    },
                )
            else:
                logger.warning("  ✗ [%d] %s — %s", result.index, result.title[:60], result.error)
                emit(f"Failed to summarise '{(result.title or 'Untitled')[:45]}' — {done}/{total}")
 
    succeeded = sum(1 for r in results if r and r.succeeded)
    failed    = len(results) - succeeded
    logger.info("Done: %d succeeded, %d failed", succeeded, failed)
 
    return [r.to_prompt_string() for r in results if r]
 
 
def summarise_all(
    documents: list[dict],
    query: str = "",
    provider: str = "anthropic",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
) -> list[SummaryResult]:
    """
    Same as summariser_agent() but returns typed SummaryResult objects
    instead of plain strings — useful when you need structured access
    to per-source metadata (model used, success/failure, etc.).
    """
    if not documents:
        return []
 
    results: list[Optional[SummaryResult]] = [None] * len(documents)
 
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(documents))) as pool:
        futures = {
            pool.submit(
                _summarise_one,
                i, doc, provider, api_key, model, base_url, query,
            ): i - 1
            for i, doc in enumerate(documents, 1)
        }
        for future in as_completed(futures):
            slot = futures[future]
            results[slot] = future.result()
 
    return [r for r in results if r is not None]