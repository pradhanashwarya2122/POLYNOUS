# app/agents/summariser_agent.py
from app.llm_client import ask_llm

def summariser_agent(user, documents, query="", provider="anthropic"):
    """
    Summarise each document using the user's preferred LLM key.
    `user` is the SQLAlchemy User object (contains encrypted API keys).
    `provider` is 'anthropic' or 'openai' (from state.preferred_provider).
    """
    summaries = []

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
            title   = doc.get('title', 'Untitled')

            messages = [{
                "role": "user",
                "content": (
                    f"Summarize this document:\n\n"
                    f"Title: {title}\n"
                    f"Content: {content}\n\n"
                    f"Provide a structured summary with the 4 points above:"
                )
            }]

            # ✅ Single call – provider routing + key resolution is handled inside ask_llm
            response = ask_llm(
                user=user,
                provider=provider,
                system_prompt=system_prompt,
                messages=messages,
                max_tokens=500,
                temperature=0.3,
            )

            summaries.append(f"Source {i+1} ({title}):\n{response}")
            print(f"  ✅ Summarized source {i+1} (via {provider})")

        except Exception as e:
            summaries.append(f"Source {i+1}: Error - {str(e)[:100]}")
            print(f"  ❌ Error summarizing source {i+1} ({provider}): {e}")

    return summaries