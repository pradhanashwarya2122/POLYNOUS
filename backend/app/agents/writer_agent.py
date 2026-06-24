# app/agents/writer_agent.py
from app.llm_client import ask_llm


def writer_agent(user, query, summaries, critique, citations,
                 response_style="academic", provider="anthropic"):
    """
    Create world‑class research answers with the user's preferred LLM.

    Args:
        user: SQLAlchemy User object (for key resolution)
        query: Original research query
        summaries: List of document summaries
        critique: Dict with confidence, contradictions, agreements
        citations: List of citation dicts
        response_style: "academic", "casual", "eli5", or "technical"
        provider: "anthropic" or "openai"

    Returns:
        Formatted research answer string
    """
    print(f"✍️ Writer: Creating answer (style: {response_style}, provider: {provider})...")

    # ─── Style‑specific system prompts ───
    style_prompts = {
        "academic": (
            "You are POLYNOUS — a world-class research synthesis engine operating at the "
            "highest academic standards.\n\n"
            "Your task is to write a comprehensive, authoritative research answer that "
            "demonstrates deep engagement with the provided sources.\n\n"
            "FORMAT YOUR RESPONSE EXACTLY LIKE THIS:\n\n"
            "📋 EXECUTIVE SUMMARY\n"
            "[2-3 clear, direct sentences answering the query with precision.]\n\n"
            "🔑 KEY FINDINGS\n"
            "• [Finding with specific data/evidence] [Source citation]\n"
            "• [Finding with specific data/evidence] [Source citation]\n"
            "• [Finding with specific data/evidence] [Source citation]\n"
            "• [Additional finding if relevant] [Source citation]\n\n"
            "⚠️ LIMITATIONS & UNCERTAINTIES\n"
            "[Honest assessment of contradictions, methodological limitations, and areas where evidence is weak.]\n\n"
            "🎯 CONFIDENCE ASSESSMENT\n"
            "[Overall confidence level with brief justification.]\n\n"
            "📚 SOURCES\n"
            "[Numbered list of sources used]"
        ),
        "casual": (
            "You are POLYNOUS — a brilliant research communicator who makes complex "
            "topics accessible and engaging.\n\n"
            "Write in a conversational yet informative tone. Use analogies and examples "
            "to explain difficult concepts. Keep it friendly but accurate.\n\n"
            "FORMAT:\n"
            "📋 THE BIG PICTURE — [1-2 sentence overview]\n"
            "🔑 WHAT YOU NEED TO KNOW\n"
            "• [Key point in plain language]\n"
            "• [Key point in plain language]\n"
            "• [Key point in plain language]\n"
            "⚠️ THE FINE PRINT — [Limitations and caveats]\n"
            "🎯 BOTTOM LINE — [Confidence assessment]\n"
            "📚 WHERE THIS COMES FROM — [Sources]"
        ),
        "eli5": (
            "You are POLYNOUS — the world's best explainer. You can make ANY topic "
            "understandable to anyone, no matter how complex.\n\n"
            "Explain like you're talking to a curious 12‑year‑old. Use simple analogies "
            "from everyday life. Avoid jargon completely. Make it fun and memorable.\n\n"
            "FORMAT:\n"
            "📋 HERE'S THE SIMPLE ANSWER — [One clear sentence]\n"
            "🔑 LET ME BREAK IT DOWN\n"
            "• [Simple explanation with analogy]\n"
            "• [Simple explanation with analogy]\n"
            "• [Simple explanation with analogy]\n"
            "⚠️ WHAT WE DON'T KNOW YET — [Simple honesty about limitations]\n"
            "🎯 HOW SURE WE ARE — [Confidence in simple terms]"
        ),
        "technical": (
            "You are POLYNOUS — an elite technical research synthesis engine designed "
            "for domain experts and practitioners.\n\n"
            "Provide a technically rigorous answer with precise terminology, "
            "quantitative data, and methodological analysis. Assume the reader has "
            "advanced domain knowledge.\n\n"
            "FORMAT:\n"
            "📋 TECHNICAL SUMMARY — [1-2 sentence precise answer]\n"
            "🔑 DETAILED ANALYSIS\n"
            "• [Technical finding with methodology details, data, and limitations] [Source]\n"
            "• [Technical finding with methodology details, data, and limitations] [Source]\n"
            "• [Technical finding with methodology details, data, and limitations] [Source]\n"
            "⚠️ METHODOLOGICAL CAVEATS — [Study design limitations, biases, confounding factors]\n"
            "🎯 STATISTICAL CONFIDENCE — [Quantitative confidence assessment]\n"
            "📚 REFERENCES — [Sources with publication details]"
        ),
    }

    # Universal quality rules applied to every style
    universal_instructions = (
        "\n\n## CRITICAL QUALITY RULES (Apply regardless of style)\n"
        "1. EVERY major claim MUST be backed by a source citation [1], [2], etc.\n"
        "2. NEVER fabricate information — if sources don't cover something, say so.\n"
        "3. When sources disagree, present BOTH sides fairly.\n"
        "4. Be SPECIFIC with numbers, dates, percentages, and proper names.\n"
        "5. Do NOT use generic phrases like \"studies show\" without a citation.\n"
        "6. Keep your response well‑structured with the sections shown above.\n"
        "7. Write in complete, grammatical sentences.\n"
        "8. Your response should be 300‑800 words depending on the complexity of the topic."
    )

    # Select the base prompt for the chosen style (fallback to academic)
    base_prompt = style_prompts.get(response_style, style_prompts["academic"])
    system_prompt = base_prompt + universal_instructions

    # ── Build the user message context ──
    summary_text = "\n\n---\n\n".join(summaries)[:4000]
    confidence = critique.get('overall_confidence', 'N/A')
    contradictions = critique.get('contradictions', [])
    agreements = critique.get('agreements', [])
    contradictions_count = len(contradictions)

    contradiction_text = ""
    if contradictions:
        contradiction_text = "CONTRADICTIONS BETWEEN SOURCES:\n" + "\n".join([
            f"• {c.get('claim1', 'Unknown')} vs {c.get('claim2', 'Unknown')}: {c.get('explanation', 'No details')}"
            for c in contradictions
        ])

    agreement_text = ""
    if agreements:
        agreement_text = "AREAS OF STRONG AGREEMENT:\n" + "\n".join([
            f"• {a.get('claim1', 'Unknown')} agrees with {a.get('claim2', 'Unknown')}: {a.get('explanation', 'No details')}"
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
        raw_answer = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_context}],
            max_tokens=1500,
            temperature=0.4,
        )

        # ✅ Ensure we have a plain string
        if isinstance(raw_answer, str):
            answer = raw_answer
        else:
            # If it's a Message object, extract the text
            answer = raw_answer.content[0].text

        print(f"  ✅ World-class answer created! (style: {response_style}, provider: {provider}, tokens: ~{len(answer.split())})")
        return answer

    except Exception as e:
        print(f"  ❌ Writer error: {e}")
        # Fallback: try again with reduced context
        try:
            print("  🔄 Falling back with reduced context...")
            raw_answer = ask_llm(
                user=user,
                provider=provider,
                system_prompt=system_prompt[:2000],
                messages=[{"role": "user", "content": user_context[:3000]}],
                max_tokens=800,
                temperature=0.5,
            )

            # ✅ Same safety check in fallback
            if isinstance(raw_answer, str):
                answer = raw_answer
            else:
                answer = raw_answer.content[0].text

            print("  ✅ Fallback answer created!")
            return answer

        except Exception as fallback_error:
            print(f"  ❌ Fallback also failed: {fallback_error}")
            return (
                "I apologise, but I encountered an error while synthesising the "
                "research. Please try again or check that your API key is valid in "
                "Settings → API Keys."
            )