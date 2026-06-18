from app.llm_client import ask_claude, ask_openai
import json

def critic_agent(user, summaries, query="", provider=None):
    """
    Analyze summaries for contradictions and confidence using the user's LLM key.
    The appropriate provider is resolved from the user object.
    """
    print("  Critic: Analyzing...")
    
    # ── Provider resolution ──
    if provider is None:
        provider = getattr(user, 'preferred_provider', None) or 'anthropic'
    if provider == 'anthropic' and not getattr(user, 'anthropic_api_key_enc', None):
        if getattr(user, 'openai_api_key_enc', None):
            provider = 'openai'
            print("  ℹ️ Anthropic key missing, falling back to OpenAI")
    elif provider == 'openai' and not getattr(user, 'openai_api_key_enc', None):
        if getattr(user, 'anthropic_api_key_enc', None):
            provider = 'anthropic'
            print("  ℹ️ OpenAI key missing, falling back to Anthropic")
    
    try:
        combined = "\n\n".join(summaries)[:4000]
        
        system_prompt = """You are a fact-checker for POLYNOUS. Analyze research summaries critically.

Return a JSON object with:
{
    "claims": [
        {"claim": "specific claim text", "confidence": 85, "sources_supporting": 2}
    ],
    "contradictions": [
        {"claim1": "first claim", "claim2": "contradicting claim", "explanation": "why they conflict"}
    ],
    "overall_confidence": 75,
    "weak_claims": ["claims with insufficient evidence"],
    "strengths": ["what the research does well"],
    "recommendations": ["how to improve the answer"]
}

Score confidence: 80-100 (strong agreement), 60-79 (minor disagreements), 40-59 (limited evidence), below 40 (unreliable)"""
        
        messages = [{
            "role": "user",
            "content": f"Query: {query}\n\nSummaries:\n{combined}\n\nProvide JSON analysis:"
        }]
        
        # Route to appropriate LLM
        if provider == 'openai':
            message = ask_openai(
                user,
                system=system_prompt,
                messages=messages,
                model="gpt-4o",
                max_tokens=500,
                temperature=0.2,
            )
        else:
            message = ask_claude(
                user,
                system=system_prompt,
                messages=messages,
                model="claude-haiku-4-5",
                max_tokens=500,
                temperature=0.2,
            )
        
        response_text = message.content[0].text
        
        # Parse JSON from response (same robust extraction as before)
        try:
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end]
            analysis = json.loads(response_text)
        except Exception:
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