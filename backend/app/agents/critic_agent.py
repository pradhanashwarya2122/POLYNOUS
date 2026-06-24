import json
import re
from app.llm_client import ask_llm

def critic_agent(user, summaries, query, provider="anthropic"):
    """Analyse summaries for contradictions and confidence using the user's own key."""
    print("🔍 Critic: Analyzing...")

    try:
        combined = "\n\n".join(summaries)[:4000]

        system_prompt = (
            "You are a fact-checker for POLYNOUS. Analyze the provided research summaries critically.\n\n"
            "Return ONLY a valid JSON object (no explanations, no markdown). The JSON must follow this structure:\n"
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
            "Confidence scale: 80-100 (strong agreement), 60-79 (minor disagreements), 40-59 (limited evidence), below 40 (unreliable)."
        )

        user_message = f"Query: {query}\n\nSummaries:\n{combined}\n\nProvide ONLY the JSON object as described, without any additional text."

        response_text = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=500,
            temperature=0.2
        )

        # Extract JSON from response – handle common cases
        analysis = None
        # Try to find a JSON code block
        code_block_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', response_text, re.DOTALL)
        if code_block_match:
            try:
                analysis = json.loads(code_block_match.group(1))
            except:
                pass

        # If no code block, try to parse the whole response as JSON
        if analysis is None:
            try:
                # Remove any markdown fences that might be present but not matched
                clean = re.sub(r'```\w*\n?', '', response_text).strip()
                analysis = json.loads(clean)
            except:
                pass

        # Fallback if parsing still fails
        if analysis is None or not isinstance(analysis, dict):
            print("  ⚠️ Could not parse JSON from critic response, using defaults")
            analysis = {
                "claims": [],
                "contradictions": [],
                "overall_confidence": 60,
                "weak_claims": ["Could not parse analysis"],
                "strengths": [],
                "recommendations": ["Verify sources manually"]
            }

        # Ensure expected keys exist
        analysis.setdefault("claims", [])
        analysis.setdefault("contradictions", [])
        analysis.setdefault("overall_confidence", 60)
        analysis.setdefault("weak_claims", [])
        analysis.setdefault("strengths", [])
        analysis.setdefault("recommendations", [])

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