from __future__ import annotations
 
import logging
import os
import re
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse
 
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from tavily import TavilyClient
from urllib3.util.retry import Retry
 
try:
    import trafilatura
    _HAS_TRAFILATURA = True
except ImportError:
    _HAS_TRAFILATURA = False
 
load_dotenv()
 
# ============================================================
# CONFIG
# ============================================================
 
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
MAX_CHARS_DEFAULT = int(os.getenv("SCRAPE_MAX_CHARS", "4000"))
REQUEST_TIMEOUT = float(os.getenv("SCRAPE_TIMEOUT", "8"))
MAX_WORKERS = int(os.getenv("SCRAPE_MAX_WORKERS", "8"))
SEARCH_MAX_RESULTS = int(os.getenv("SEARCH_MAX_RESULTS", "12"))
CACHE_TTL_SECONDS = int(os.getenv("SCRAPE_CACHE_TTL", "900"))  # 15 min
MIN_DOMAIN_DELAY = float(os.getenv("SCRAPE_DOMAIN_DELAY", "0.5"))
QUIET = os.getenv("SCRAPE_QUIET", "0") == "1"
 
logging.basicConfig(
    level=logging.WARNING if QUIET else logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("web_search")
 
tavily = TavilyClient(api_key=TAVILY_API_KEY)
 
_UNWANTED_TAGS = [
    "script", "style", "nav", "header", "footer",
    "aside", "noscript", "iframe", "form", "button",
    "input", "select", "textarea", "svg", "canvas",
    "video", "audio", "source", "track",
]
 
_UNWANTED_CLASS_RE = re.compile(
    "|".join([
        "advertisement", "ads?", "sidebar", "widget",
        "comments?", "social", "share", "related",
        "recommended", "sponsored", "banner", "popup",
        "modal", "overlay", "cookie", "consent", "newsletter",
    ]),
    re.I,
)
 
_CONTENT_SELECTORS = [
    "article", "main", '[role="main"]',
    ".post-content", ".article-content", ".entry-content",
    ".content-body", ".story-body", ".article-body",
    "#article-body", "#content", ".content",
]
 
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}
 
 
def _make_session() -> requests.Session:
    """Session with connection pooling + automatic retry/backoff on transient errors."""
    session = requests.Session()
    retry = Retry(
        total=2,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(_HEADERS)
    return session
 
 
_session = _make_session()
 
# ============================================================
# SMALL UTILITIES: cache + per-domain rate limiter
# ============================================================
 
class _TTLCache:
    def __init__(self, ttl: int):
        self.ttl = ttl
        self._store: dict[str, tuple[float, str]] = {}
        self._lock = threading.Lock()
 
    def get(self, key: str) -> Optional[str]:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            ts, value = entry
            if time.time() - ts > self.ttl:
                del self._store[key]
                return None
            return value
 
    def set(self, key: str, value: str) -> None:
        with self._lock:
            self._store[key] = (time.time(), value)
 
 
class _DomainRateLimiter:
    """Ensures we don't fire multiple concurrent requests at the same host too fast."""
 
    def __init__(self, min_delay: float):
        self.min_delay = min_delay
        self._last_hit: dict[str, float] = defaultdict(float)
        self._lock = threading.Lock()
 
    def wait(self, url: str) -> None:
        domain = urlparse(url).netloc
        with self._lock:
            now = time.time()
            wait_for = self.min_delay - (now - self._last_hit[domain])
            self._last_hit[domain] = max(now, self._last_hit[domain] + self.min_delay)
        if wait_for > 0:
            time.sleep(wait_for)
 
 
_cache = _TTLCache(CACHE_TTL_SECONDS)
_rate_limiter = _DomainRateLimiter(MIN_DOMAIN_DELAY)
 
# ============================================================
# RESULT MODEL
# ============================================================
 
@dataclass
class SourceResult:
    title: str
    url: str
    content: str = ""
    content_source: str = "minimal"  # "scraped" | "snippet" | "minimal"
    content_length: int = 0
    score: float = 0.0
    error: Optional[str] = None
    fetched_at: float = 0.0

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "content": self.content,
            "content_source": self.content_source,
            "content_length": self.content_length,
            "score": self.score,
            "fetched_at": self.fetched_at,
        }
 
 
# ============================================================
# TEXT HELPERS
# ============================================================
 
def _truncate_at_sentence(text: str, max_chars: int) -> str:
    """Truncate to max_chars without cutting a sentence in half where avoidable."""
    if len(text) <= max_chars:
        return text.strip()
    cut = text[:max_chars]
    last_period = max(cut.rfind(". "), cut.rfind(".\n"))
    if last_period > max_chars * 0.5:  # only trust it if we're not losing too much
        return cut[: last_period + 1].strip()
    return cut.strip()
 
 
def _clean_bs4_text(soup: BeautifulSoup) -> str:
    for tag in _UNWANTED_TAGS:
        for el in soup.find_all(tag):
            el.decompose()
    for el in soup.find_all(class_=_UNWANTED_CLASS_RE):
        el.decompose()
 
    main_content = None
    for selector in _CONTENT_SELECTORS:
        main_content = soup.select_one(selector)
        if main_content:
            break
    if not main_content:
        main_content = soup.body if soup.body else soup
 
    text = main_content.get_text(separator=" ")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text)
    # Drop very short "sentences" (menu items etc.)
    text = " ".join(t for t in text.split(".") if len(t.strip()) > 20)
    return text.strip()
 
 
# ============================================================
# SCRAPER
# ============================================================
 
def scrape_full_content(url: str, max_chars: int = MAX_CHARS_DEFAULT) -> tuple[str, Optional[str]]:
    """
    Scrape readable text content from a URL.
 
    Returns (content, error). content is "" on failure; error describes why.
    Tries trafilatura first (if installed) since it handles boilerplate
    removal far better than heuristic BS4 selectors; falls back to BS4.
    """
    cached = _cache.get(url)
    if cached is not None:
        return cached, None
 
    _rate_limiter.wait(url)
 
    try:
        response = _session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        return "", "timeout"
    except requests.exceptions.RequestException as e:
        return "", f"request_failed: {str(e)[:80]}"
    except Exception as e:
        return "", f"unexpected: {str(e)[:80]}"
 
    text = ""
 
    if _HAS_TRAFILATURA:
        try:
            extracted = trafilatura.extract(
                response.text,
                include_comments=False,
                include_tables=False,
                favor_precision=True,
            )
            if extracted:
                text = re.sub(r"\s+", " ", extracted).strip()
        except Exception:
            text = ""  # fall through to BS4
 
    if not text:
        try:
            soup = BeautifulSoup(response.text, "html.parser")
            text = _clean_bs4_text(soup)
        except Exception as e:
            return "", f"parse_failed: {str(e)[:80]}"
 
    result = _truncate_at_sentence(text, max_chars)
    if result:
        _cache.set(url, result)
    return result, None
 
 
# ============================================================
# MAIN SEARCH FUNCTION
# ============================================================
 
def search_web(query: str, max_results: int = SEARCH_MAX_RESULTS, max_chars: int = MAX_CHARS_DEFAULT,
               progress_cb=None) -> list[dict]:
    """
    Search the web using Tavily, then scrape full content from each result
    concurrently. Falls back to Tavily's snippet per-result if scraping fails.
 
    Returns a list of dicts (kept dict-shaped for drop-in compatibility with
    the original API); use SourceResult directly if you want typed access.
    """
    logger.info("SEARCHING: %s", query[:100])
    emit = progress_cb or (lambda msg, patch=None: None)
    emit(f"Querying Tavily (advanced, up to {max_results} results)…")

    try:
        response = tavily.search(
            query=query,
            search_depth="advanced",
            max_results=max_results,
            include_answer=False,
            include_raw_content=True,
        )
    except Exception as e:
        logger.error("Tavily search failed: %s", e)
        emit(f"Tavily search failed: {str(e)[:80]}")
        return []

    raw_results = response.get("results", [])
    if not raw_results:
        logger.warning("No results found for query: %s", query[:100])
        emit("No results found")
        return []
 
    # Dedupe by URL while preserving order
    seen_urls = set()
    deduped = []
    for r in raw_results:
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            deduped.append(r)
 
    sources = [
        SourceResult(
            title=r.get("title", "Untitled"),
            url=r.get("url", ""),
            content=r.get("content", ""),  # tavily snippet, used as fallback
            score=r.get("score", 0.0),
        )
        for r in deduped
    ]
 
    def _scrape_one(source: SourceResult) -> SourceResult:
        snippet = source.content
        scraped, error = scrape_full_content(source.url, max_chars=max_chars)

        if scraped and len(scraped) > 200:
            source.content = scraped
            source.content_source = "scraped"
            source.content_length = len(scraped)
        elif snippet and len(snippet) > 100:
            source.content = snippet
            source.content_source = "snippet"
            source.content_length = len(snippet)
        else:
            source.content = snippet or ""
            source.content_source = "minimal"
            source.content_length = len(source.content)
            source.error = error

        source.fetched_at = time.time()
        return source

    total = len(sources)
    emit(f"Got {total} results — scraping full articles…")

    scraped_count = snippet_count = minimal_count = 0
    total_chars = 0
    done = 0
    recent: list[dict] = []

    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, max(1, len(sources)))) as pool:
        futures = {pool.submit(_scrape_one, s): s for s in sources}
        for future in as_completed(futures):
            s = future.result()
            total_chars += s.content_length
            done += 1
            if s.content_source == "scraped":
                scraped_count += 1
                logger.info("  ✓ scraped %-60s (%d chars)", s.url[:60], s.content_length)
            elif s.content_source == "snippet":
                snippet_count += 1
                logger.info("  · snippet %-60s (%d chars)", s.url[:60], s.content_length)
            else:
                minimal_count += 1
                logger.info("  ! minimal %-60s (%s)", s.url[:60], s.error or "no content")

            domain = urlparse(s.url).netloc or s.url[:40]
            recent.append({
                "domain": domain,
                "title": (s.title or "Untitled")[:70],
                "score": round(s.score, 2),
                "badge": "ARTICLE" if s.content_source == "scraped" else "SNIPPET",
                "chars": s.content_length,
            })
            emit(
                f"Fetched {domain} ({s.content_length:,} chars) — {done}/{total}",
                {
                    "agents": {"Search": {
                        "progress": round(10 + 85 * done / total),
                        "phase": {"label": "Scraping", "sub": f"{done}/{total} sources fetched"},
                        "stats": [["Total", str(done)], ["Full articles", str(scraped_count)],
                                  ["Snippets", str(snippet_count + minimal_count)]],
                        "lastSource": {
                            "id": f"Source {done}",
                            "badge": "ARTICLE" if s.content_source == "scraped" else "SNIPPET",
                            "title": (s.title or "Untitled")[:60],
                            "description": (s.content or "")[:120] + "...",
                            "time": "now",
                            "score": str(round(s.score, 2)),
                        },
                        "recentSources": recent[-4:],
                    }},
                    "lanes": {"Search": {"sub": f"{done}/{total} scraped", "status": "working"}},
                    "metrics": {"sources": done},
                },
            )
 
    # as_completed doesn't preserve order; restore original ranking
    order = {s.url: i for i, s in enumerate(sources)}
    sources.sort(key=lambda s: order.get(s.url, 0))
 
    logger.info(
        "DONE: %d sources | scraped=%d snippet=%d minimal=%d | %d total chars",
        len(sources), scraped_count, snippet_count, minimal_count, total_chars,
    )
 
    return [s.to_dict() for s in sources]
 
 
# ============================================================
# FORMAT SOURCES FOR PROMPTS
# ============================================================
 
def format_sources_for_prompt(results: list[dict], per_source_char_cap: int = 3000) -> str:
    """Format search results into a single string for agent prompts."""
    if not results:
        return "No sources available."
 
    labels = {
        "scraped": "📄 FULL ARTICLE",
        "snippet": "📎 SEARCH SNIPPET",
        "minimal": "⚠️ MINIMAL CONTENT",
    }
 
    blocks = []
    for i, result in enumerate(results, 1):
        title = result.get("title", "Untitled")
        url = result.get("url", "")
        content = result.get("content", "")
        source_type = result.get("content_source", "snippet")
        content_length = result.get("content_length", 0)
        type_label = labels.get(source_type, "📎 SEARCH SNIPPET")
 
        blocks.append(
            f"\n{'─' * 60}\n"
            f"SOURCE {i}: {title}\n"
            f"URL: {url}\n"
            f"CONTENT TYPE: {type_label} ({content_length} characters)\n"
            f"{'─' * 60}\n"
            f"{content[:per_source_char_cap]}\n"
        )
 
    return "\n".join(blocks)
 
 
def format_source_metadata(results: list[dict]) -> str:
    """Quick reference index of all sources."""
    lines = ["\n📚 SOURCE INDEX:"]
    for i, result in enumerate(results, 1):
        title = result.get("title", "Untitled")[:80]
        url = result.get("url", "")[:60]
        source_type = result.get("content_source", "snippet")
        icon = "📄" if source_type == "scraped" else "📎"
        lines.append(f"  {icon} [{i}] {title}")
        lines.append(f"     {url}")
    return "\n".join(lines)
 
 
if __name__ == "__main__":
    # Quick manual smoke test: python web_search_enhanced.py "your query"
    import sys
 
    q = " ".join(sys.argv[1:]) or "latest developments in multi-agent AI systems"
    results = search_web(q, max_results=5)
    print(format_source_metadata(results))
    print(format_sources_for_prompt(results))