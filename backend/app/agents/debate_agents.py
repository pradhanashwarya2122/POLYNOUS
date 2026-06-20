from app.llm_client import ask_llm
from app.utils.key_resolver import get_anthropic_key, get_openai_key
import json
import os
from dotenv import load_dotenv

load_dotenv()

def argue_for_position(user, query: str, context: list, provider: str = "anthropic") -> str:
    """
    Argue FOR the proposition using the user's own API key.
    """
    print("  🟢 FOR: Building argument...")

    context_text = "\n".join(context[:2]) if context else "No sources provided"

    system_prompt = (
        "You are a debate champion arguing FOR a proposition. "
        "Use evidence from the provided sources. Make 2‑3 strong points with citations. "
        "Be persuasive but factual. Start with: 'ARGUMENT FOR:'"
    )
    messages = [{
        "role": "user",
        "content": f"Proposition: {query}\n\nSources:\n{context_text}\n\nArgue FOR this proposition:"
    }]

    try:
        response = ask_llm(user, provider, system_prompt, messages, max_tokens=400, temperature=0.8)
        return response
    except Exception as e:
        print(f"  ❌ FOR error: {e}")
        return f"ERROR: {str(e)}"


def argue_against_position(user, query: str, context: list, provider: str = "anthropic") -> str:
    """
    Argue AGAINST the proposition using the user's own API key.
    """
    print("  🔴 AGAINST: Building counter-argument...")

    context_text = "\n".join(context[:2]) if context else "No sources provided"

    system_prompt = (
        "You are a debate champion arguing AGAINST a proposition. "
        "Use evidence from the provided sources. Make 2‑3 strong counter-points with citations. "
        "Be persuasive but factual. Start with: 'ARGUMENT AGAINST:'"
    )
    messages = [{
        "role": "user",
        "content": f"Proposition: {query}\n\nSources:\n{context_text}\n\nArgue AGAINST this proposition:"
    }]

    try:
        response = ask_llm(user, provider, system_prompt, messages, max_tokens=400, temperature=0.8)
        return response
    except Exception as e:
        print(f"  ❌ AGAINST error: {e}")
        return f"ERROR: {str(e)}"


def judge_debate(user, for_arg: str, against_arg: str, query: str, provider: str = "anthropic") -> dict:
    """
    Judge which side won the debate, using the user's own API key.
    """
    print("  ⚖️ JUDGE: Evaluating...")

    system_prompt = (
        "You are an impartial debate judge. Evaluate both arguments and return JSON only:\n"
        '{"winner": "FOR" or "AGAINST" or "TIE", '
        '"reasoning": "Brief explanation", '
        '"strongest_point": "Best argument", '
        '"for_score": 7, "against_score": 8}'
    )
    messages = [{
        "role": "user",
        "content": f"Topic: {query}\n\nFOR:\n{for_arg[:1500]}\n\nAGAINST:\n{against_arg[:1500]}\n\nJudge and return JSON:"
    }]

    try:
        response = ask_llm(user, provider, system_prompt, messages, max_tokens=300, temperature=0.3)
        # Parse JSON from response
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        verdict = json.loads(response)
        print(f"  ✅ Winner: {verdict.get('winner', 'TIE')}")
        return verdict
    except Exception as e:
        print(f"  ❌ Judge error: {e}")
        return {
            "winner": "TIE",
            "reasoning": f"Error in judgment: {str(e)[:100]}",
            "strongest_point": "N/A",
            "for_score": 5,
            "against_score": 5
        }