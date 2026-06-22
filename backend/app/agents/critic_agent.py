import json
from app.llm_client import ask_llm

def critic_agent(user, summaries, query, provider="anthropic"):
    """Analyse summaries for contradictions and confidence using the user's own key."""
    print("🔍 Critic: Analyzing...")

    try:
        combined = "\n\n".join(summaries)[:4000]

        system_prompt = (
            "You are a fact-checker for POLYNOUS. Analyze research summaries critically.\n\n"
            "Return a JSON object with:\n"
            '{\n'
            '    "claims": [\n'
            '        {"claim": "specific claim text", "confidence": 85, "sources_supporting": 2}\n'
            '    ],\n'
            '    "contradictions": [\n'
            '        {"claim1": "first claim", "claim2": "contradicting claim", "explanation": "why they conflict"}\n'
            '    ],\n'
            '    "overall_confidence": 75,\n'
            '    "weak_claims": ["claims with insufficient evidence"],\n'
            '    "strengths": ["what the research does well"],\n'
            '    "recommendations": ["how to improve the answer"]\n'
            '}\n\n'
            "Score confidence: 80-100 (strong agreement), 60-79 (minor disagreements), "
            "40-59 (limited evidence), below 40 (unreliable)"
        )

        user_message = f"Query: {query}\n\nSummaries:\n{combined}\n\nProvide JSON analysis:"

        response_text = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=500,
            temperature=0.2
        )

        # Parse JSON from response
        try:
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end]
            analysis = json.loads(response_text)
        except:
            analysis = {
                "claims": [],
                "contradictions": [],
                "overall_confidence": 60,
                "weak_claims": ["Could not parse analysis"],
                "strengths": [],
                "recommendations": ["Verify sources manually"]
            }

        print(f"  ✅ Confidence: {analysis.get('overall_confidence', 'N/A')}%")
        return analysis

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return {
            "claims": [],
            "contradictions": [],
            "overall_confidence": 50,
            "weak_claims": [str(e)[:100]],
            "recommendations": ["Try again"]
        }