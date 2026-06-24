# backend/app/search_agent.py
from app.utils.key_resolver import get_tavily_key
from app.llm_client import ask_llm
from tavily import TavilyClient

def search_web(user, query: str, session_id: str = None):
    """
    Search the web using ONLY the user's personal Tavily key.
    No fallback to system key — empty result if user has no key.
    """
    api_key = None
    if user:
        try:
            api_key = get_tavily_key(user)
        except Exception:
            api_key = None

    if not api_key:
        print("  Search error: No Tavily API key configured for this user")
        return []

    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(query, max_results=3, search_depth="basic")
        print(f"  Searching for: {query} (user: {user.id if user else '?'})")
        return response.get('results', [])
    except Exception as e:
        print(f"  Search error: {e}")
        return []


def format_search_results(results):
    """Format search results for the LLM."""
    if not results:
        return "No search results found."

    formatted = []
    for i, result in enumerate(results, 1):
        formatted.append(
            f"Source {i}:\n"
            f"Title: {result.get('title', 'Untitled')}\n"
            f"Content: {result.get('content', '')[:500]}\n"
            f"URL: {result.get('url', '')}\n"
        )
    return "\n---\n".join(formatted)


def ask_claude_with_context(user, query: str, context: str, provider=None, session_id: str = None) -> str:
    """
    Ask the user's preferred LLM with search context.
    Uses the centralized ask_llm which handles key resolution and
    provider switching automatically.
    """
    # ── Determine provider from user preferences ──
    if provider is None:
        provider = getattr(user, 'preferred_provider', None) or 'anthropic'

    system_prompt = (
        "You are a research assistant. Use the provided search results to answer "
        "questions. Always cite your sources by number [1], [2], etc. If search "
        "results don't contain the answer, say so."
    )

    user_message = (
        f"Search Results:\n{context}\n\n"
        f"Question: {query}\n\n"
        f"Answer (with source citations):"
    )

    try:
        print(f"  Asking LLM about: {query} (provider: {provider})")
        result = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=500,
            temperature=0.3,
        )
        # ask_llm always returns a string, so we can return it directly
        return result
    except Exception as e:
        return f"Error getting AI response: {str(e)}"