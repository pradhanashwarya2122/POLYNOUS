from app.llm_client import ask_claude, ask_openai

def summariser_agent(user, documents, query="", provider=None):
    """
    Summarise each document using the user's preferred LLM key.
    If `provider` is not specified, it uses the user's preferred_provider,
    otherwise falls back to Anthropic if available, then OpenAI.
    """
    summaries = []
    
    # ── Determine which provider to use ──
    if provider is None:
        provider = getattr(user, 'preferred_provider', None) or 'anthropic'
    
    # Fallback logic: if the user doesn't have the chosen key, try the other one
    if provider == 'anthropic' and not getattr(user, 'anthropic_api_key_enc', None):
        if getattr(user, 'openai_api_key_enc', None):
            provider = 'openai'
            print("  ℹ️ Anthropic key missing, falling back to OpenAI")
    elif provider == 'openai' and not getattr(user, 'openai_api_key_enc', None):
        if getattr(user, 'anthropic_api_key_enc', None):
            provider = 'anthropic'
            print("  ℹ️ OpenAI key missing, falling back to Anthropic")
    
    # ── System prompt (identical for both providers) ──
    system_prompt = """You are a research summarizer for POLYNOUS. Extract key information from documents.

For each document, provide:
1. The main argument or finding (1 sentence)
2. Key data points, statistics, or evidence mentioned
3. Any limitations or caveats noted
4. The overall reliability of the source

Be specific. Include numbers, dates, and proper nouns when available.
Keep each summary to 5-7 lines maximum."""

    for i, doc in enumerate(documents):
        try:
            content = doc.get('content', '')[:2000]
            title = doc.get('title', 'Untitled')
            
            # Common message payload
            messages = [{
                "role": "user",
                "content": f"Summarize this document:\n\nTitle: {title}\nContent: {content}\n\nProvide a structured summary with the 4 points above:"
            }]
            
            # Route to the appropriate API
            if provider == 'openai':
                message = ask_openai(
                    user,
                    system=system_prompt,
                    messages=messages,
                    model="gpt-4o",          # you can change this as needed
                    temperature=0.3
                )
                # OpenAI response structure may differ (assume `.content[0].text` or similar)
                summary = message.content[0].text
            else:
                message = ask_claude(
                    user,
                    system=system_prompt,
                    messages=messages,
                    # model and temperature can be added if ask_claude supports them
                )
                summary = message.content[0].text
            
            summaries.append(f"Source {i+1} ({title}):\n{summary}")
            print(f"  ✅ Summarized source {i+1} (via {provider})")
            
        except Exception as e:
            summaries.append(f"Source {i+1}: Error - {str(e)[:100]}")
            print(f"  ❌ Error summarizing source {i+1} ({provider}): {e}")
    
    return summaries