# backend/app/search_agent.py
from app.utils.key_resolver import get_tavily_key
from app.llm_client import ask_claude, ask_openai
from tavily import TavilyClient

def search_web(user, query: str, session_id: str = None):
    """
    Search the web using the user's Tavily key.
    The key is resolved from the user object via the centralized key resolver.
    """
    try:
        api_key = get_tavily_key(user)
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
    The LLM provider (Anthropic or OpenAI) is chosen based on the user's available keys,
    falling back automatically if the preferred one is missing.
    """
    # ── Provider resolution ──
    if provider is None:
        provider = getattr(user, 'preferred_provider', None) or 'anthropic'
    if provider == 'anthropic' and not getattr(user, 'anthropic_api_key_enc', None):
        if getattr(user, 'openai_api_key_enc', None):
            provider = 'openai'
            print("  ℹ️ Anthropic key missing, using OpenAI")
    elif provider == 'openai' and not getattr(user, 'openai_api_key_enc', None):
        if getattr(user, 'anthropic_api_key_enc', None):
            provider = 'anthropic'
            print("  ℹ️ OpenAI key missing, using Anthropic")

    system = "You are a research assistant. Use the provided search results to answer questions. Always cite your sources by number [1], [2], etc. If search results don't contain the answer, say so."
    messages = [{
        "role": "user",
        "content": f"Search Results:\n{context}\n\nQuestion: {query}\n\nAnswer (with source citations):"
    }]

    try:
        print(f"  Asking LLM about: {query} (provider: {provider})")
        if provider == 'openai':
            resp = ask_openai(
                user,
                system=system,
                messages=messages,
                model="gpt-4o",
                max_tokens=500,
                temperature=0.3,
            )
        else:
            resp = ask_claude(
                user,
                system=system,
                messages=messages,
                model="claude-haiku-4-5",
                max_tokens=500,
                temperature=0.3,
            )
        return resp.content[0].text
    except Exception as e:
        return f"Error getting AI response: {str(e)}"