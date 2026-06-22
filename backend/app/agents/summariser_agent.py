from app.llm_client import ask_llm
from app.utils.key_resolver import get_anthropic_key, get_openai_key

def summariser_agent(user, documents, query, provider="anthropic"):
    """
    Summarise each document using the user's own LLM key.
    If the user has no key, the call will raise an error.
    """
    summaries = []

    # Build system prompt
    system_prompt = (
        "You are a research summarizer for POLYNOUS. Extract key information from documents.\n\n"
        "For each document, provide:\n"
        "1. The main argument or finding (1 sentence)\n"
        "2. Key data points, statistics, or evidence mentioned\n"
        "3. Any limitations or caveats noted\n"
        "4. The overall reliability of the source\n\n"
        "Be specific. Include numbers, dates, and proper nouns when available.\n"
        "Keep each summary to 5-7 lines maximum."
    )

    for i, doc in enumerate(documents):
        try:
            content = doc.get('content', '')[:2000]
            title = doc.get('title', 'Untitled')

            user_message = f"Summarize this document:\n\nTitle: {title}\nContent: {content}\n\nProvide a structured summary with the 4 points above:"

            # Call the LLM with the user's key
            result = ask_llm(
                user=user,
                provider=provider,
                system_prompt=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=300,
                temperature=0.3
            )

            summaries.append(f"Source {i+1} ({title}):\n{result}")
            print(f"  ✅ Summarized source {i+1}")

        except Exception as e:
            summaries.append(f"Source {i+1}: Error - {str(e)[:100]}")
            print(f"  ❌ Error summarizing source {i+1}: {e}")

    return summaries