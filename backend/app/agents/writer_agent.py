# app/agents/writer_agent.py
from app.llm_client import ask_llm

def writer_agent(user, query, summaries, critique, citations,
                 response_style="academic", provider="anthropic"):
    """
    Create world‑class research answers with the user's preferred LLM.
    `user` is the SQLAlchemy User object.
    `provider` is 'anthropic' or 'openai' (from state.preferred_provider).
    """
    print(f"✍️ Writer: Creating answer (style: {response_style})...")

    # ─── Style‑specific system prompts (your original, full content) ───
    style_prompts = {
        "academic": """You are POLYNOUS — a world-class research synthesis engine … [your full academic prompt here]""",
        "casual": """You are POLYNOUS — a brilliant research communicator … [your full casual prompt]""",
        "eli5": """You are POLYNOUS — the world's best explainer … [your full eli5 prompt]""",
        "technical": """You are POLYNOUS — an elite technical research synthesis engine … [your full technical prompt]""",
    }

    # Universal quality rules appended to every style
    universal_instructions = """
## CRITICAL QUALITY RULES (Apply regardless of style)
… [your full universal_instructions text] …
"""

    # Select the base prompt for the chosen style (fallback to academic)
    base_prompt = style_prompts.get(response_style, style_prompts["academic"])
    system_prompt = base_prompt + "\n\n" + universal_instructions

    # ── Build the user message context ──
    summary_text = "\n\n---\n\n".join(summaries)[:4000]
    confidence = critique.get('overall_confidence', 'N/A')
    contradictions = critique.get('contradictions', [])
    agreements = critique.get('agreements', [])
    contradictions_count = len(contradictions)

    contradiction_text = ""
    if contradictions:
        contradiction_text = "CONTRADICTIONS BETWEEN SOURCES:\n" + "\n".join([
            f"• {c.get('topic', 'Unknown')}: {c.get('description', 'No details')}"
            for c in contradictions
        ])

    agreement_text = ""
    if agreements:
        agreement_text = "AREAS OF STRONG AGREEMENT:\n" + "\n".join([
            f"• {a.get('topic', 'Unknown')}: {a.get('description', 'No details')}"
            for a in agreements
        ])

    citation_text = "\n".join([
        f"[{i+1}] {c.get('title', 'Untitled')} ({c.get('year', 'n.d.')}) - {c.get('source_type', 'Unknown source')}"
        for i, c in enumerate(citations)
    ])

    user_context = f"""## USER QUERY
{query}

## RESEARCH FINDINGS FROM MULTIPLE SOURCES
{summary_text}

## QUALITY ANALYSIS
- Aggregate Confidence Score: {confidence}%
- Number of Contradictions Found: {contradictions_count}
{contradiction_text}
{agreement_text}

## AVAILABLE CITATIONS
{citation_text}

## INSTRUCTIONS
Write a comprehensive, authoritative research answer. 
Target style: {response_style.upper()}
The response should demonstrate deep engagement with the provided sources.
Every major claim must be sourceable. Be specific with data and numbers.
Acknowledge uncertainty and conflicting evidence honestly."""

    # ── Primary call with full context ──
    try:
        answer = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_context}],
            max_tokens=1500,
            temperature=0.4,
        )
        print(f"  ✅ World-class answer created! (style: {response_style}, provider: {provider}, tokens: ~{len(answer.split())})")
        return answer

    except Exception as e:
        print(f"  ❌ Writer error: {e}")
        # Fallback: try again with reduced context and lighter model
        try:
            print("  🔄 Falling back to lighter model...")
            answer = ask_llm(
                user=user,
                provider=provider,
                system_prompt=system_prompt[:2000],
                messages=[{"role": "user", "content": user_context[:3000]}],
                max_tokens=800,
                temperature=0.5,
            )
            print("  ✅ Fallback answer created!")
            return answer
        except Exception as fallback_error:
            print(f"  ❌ Fallback also failed: {fallback_error}")
            return "I apologise, but I encountered an error while synthesising the research. Please try again."