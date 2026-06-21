import json
import os
from dotenv import load_dotenv
from anthropic import Anthropic
from openai import OpenAI

load_dotenv()


def argue_for_position(query: str, context: list, api_key: str = None, provider: str = "anthropic") -> str:
    """Argue FOR the proposition using the provided API key."""
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
        if provider == "openai":
            client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": system_prompt}] + messages,
                max_tokens=400,
                temperature=0.8,
            )
            return response.choices[0].message.content
        else:
            client = Anthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=400,
                temperature=0.8,
                system=system_prompt,
                messages=messages,
            )
            return response.content[0].text
    except Exception as e:
        print(f"  ❌ FOR error: {e}")
        return f"ERROR: {str(e)}"


def argue_against_position(query: str, context: list, api_key: str = None, provider: str = "anthropic") -> str:
    """Argue AGAINST the proposition using the provided API key."""
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
        if provider == "openai":
            client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": system_prompt}] + messages,
                max_tokens=400,
                temperature=0.8,
            )
            return response.choices[0].message.content
        else:
            client = Anthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=400,
                temperature=0.8,
                system=system_prompt,
                messages=messages,
            )
            return response.content[0].text
    except Exception as e:
        print(f"  ❌ AGAINST error: {e}")
        return f"ERROR: {str(e)}"


def judge_debate(for_arg: str, against_arg: str, query: str, api_key: str = None, provider: str = "anthropic") -> dict:
    """Judge the debate using the provided API key."""
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
        if provider == "openai":
            client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": system_prompt}] + messages,
                max_tokens=300,
                temperature=0.3,
            )
            raw = response.choices[0].message.content
        else:
            client = Anthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=300,
                temperature=0.3,
                system=system_prompt,
                messages=messages,
            )
            raw = response.content[0].text

        # Parse JSON from response
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        verdict = json.loads(raw)
        print(f"  ✅ Winner: {verdict.get('winner', 'TIE')}")
        return verdict
    except Exception as e:
        print(f"  ❌ Judge error: {e}")
        return {
            "winner": "TIE",
            "reasoning": f"Error in judgment: {str(e)[:100]}",
            "strongest_point": "N/A",
            "for_score": 5,
            "against_score": 5,
        }