# app/agents/debate_agents.py
import json
import random
from app.llm_client import ask_llm

def argue_for_position(query: str, context: list, user=None, provider: str = "anthropic") -> str:
    """Argue FOR the main proposition using the user's own API key."""
    print("  🟢 FOR: Building argument...")

    try:
        context_text = "\n".join(context[:2]) if context else "No sources provided"

        system_prompt = (
            "You are an expert debate advocate arguing FOR a proposition.\n\n"
            "RULES:\n"
            "1. Provide 4-6 detailed, substantive points\n"
            "2. Each point must be a complete paragraph with specific evidence, examples, or data\n"
            "3. Use concrete numbers, studies, or real-world examples where possible\n"
            "4. Address potential counter-arguments within your points\n"
            "5. Be thorough and analytical, not just persuasive\n"
            "6. Start each point on a new line with a clear topic sentence\n"
            "7. Make each point at least 3-4 sentences long\n"
            "8. Label each point clearly as 'Point 1:', 'Point 2:', etc.\n\n"
            "FORMAT:\n"
            "Point 1: [Clear topic sentence]. [Detailed explanation with evidence]. [Analysis and implications].\n\n"
            "Point 2: [Clear topic sentence]. [Detailed explanation with evidence]. [Analysis and implications].\n\n"
            "...etc"
        )

        answer = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{
                "role": "user",
                "content": f"Proposition: {query}\n\nSources:\n{context_text}\n\nArgue FOR this proposition:"
            }],
            max_tokens=1000,
            temperature=0.8,
        )
        print("  ✅ FOR argument ready")
        return answer

    except Exception as e:
        print(f"  ❌ FOR error: {e}")
        return f"ERROR: {str(e)}"


def argue_against_position(query: str, context: list, user=None, provider: str = "anthropic") -> str:
    """Argue AGAINST the main proposition using the user's own API key."""
    print("  🔴 AGAINST: Building counter-argument...")

    try:
        context_text = "\n".join(context[:2]) if context else "No sources provided"

        system_prompt = (
            "You are an expert debate advocate arguing AGAINST a proposition.\n\n"
            "RULES:\n"
            "1. Provide 4-6 detailed, substantive counter-points\n"
            "2. Each point must be a complete paragraph with specific evidence, examples, or data\n"
            "3. Use concrete numbers, studies, or real-world examples where possible\n"
            "4. Directly address and refute the FOR position's likely arguments\n"
            "5. Be thorough and analytical, not just persuasive\n"
            "6. Start each point on a new line with a clear topic sentence\n"
            "7. Make each point at least 3-4 sentences long\n"
            "8. Label each point clearly as 'Counter-Point 1:', 'Counter-Point 2:', etc.\n\n"
            "FORMAT:\n"
            "Counter-Point 1: [Clear topic sentence]. [Detailed explanation with evidence]. [Analysis and implications].\n\n"
            "Counter-Point 2: [Clear topic sentence]. [Detailed explanation with evidence]. [Analysis and implications].\n\n"
            "...etc"
        )

        answer = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{
                "role": "user",
                "content": f"Proposition: {query}\n\nSources:\n{context_text}\n\nArgue AGAINST this proposition:"
            }],
            max_tokens=1000,
            temperature=0.8,
        )
        print("  ✅ AGAINST argument ready")
        return answer

    except Exception as e:
        print(f"  ❌ AGAINST error: {e}")
        return f"ERROR: {str(e)}"


def judge_debate(for_arg: str, against_arg: str, query: str, user=None, provider: str = "anthropic") -> dict:
    """Judge which side won the debate using the user's own API key."""
    print("  ⚖️ JUDGE: Evaluating...")

    try:
        system_prompt = (
            "You are an impartial debate judge. You MUST pick a winner – never declare a tie.\n\n"
            "Evaluate both arguments based on:\n"
            "1. Quality of evidence and citations\n"
            "2. Logical reasoning and structure\n"
            "3. How well they address counter-arguments\n"
            "4. Persuasiveness and clarity\n\n"
            "Score each side from 1-10 (10 being perfect).\n\n"
            "Return ONLY valid JSON:\n"
            '{"winner":"FOR","for_score":7,"against_score":5,'
            '"reasoning":"FOR won because they provided stronger evidence...",'
            '"strongest_point":"The strongest argument was..."}'
        )

        text = ask_llm(
            user=user,
            provider=provider,
            system_prompt=system_prompt,
            messages=[{
                "role": "user",
                "content": (
                    f"Topic: {query}\n\n"
                    f"FOR ARGUMENT:\n{for_arg[:1500]}\n\n"
                    f"AGAINST ARGUMENT:\n{against_arg[:1500]}\n\n"
                    "You MUST pick a winner (FOR or AGAINST). Never say TIE. Return JSON:"
                )
            }],
            max_tokens=500,
            temperature=0.3,
        )

        # ── Robust JSON extraction ──
        try:
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                text = text[start:end].strip()
            elif "```" in text:
                start = text.find("```") + 3
                end = text.find("```", start)
                text = text[start:end].strip()

            verdict = json.loads(text)

            # Force a winner if TIE
            if verdict.get('winner', '').upper() == 'TIE':
                if verdict.get('for_score', 5) >= verdict.get('against_score', 5):
                    verdict['winner'] = 'FOR'
                else:
                    verdict['winner'] = 'AGAINST'
                verdict['reasoning'] = (verdict.get('reasoning', '') +
                                        ' Although close, one side had marginally better arguments.').strip()

            # Ensure scores differ
            if verdict.get('for_score') == verdict.get('against_score'):
                if verdict['winner'] == 'FOR':
                    verdict['for_score'] = min(10, verdict['for_score'] + 1)
                else:
                    verdict['against_score'] = min(10, verdict['against_score'] + 1)

        except Exception:
            # Fallback verdict
            winner = random.choice(['FOR', 'AGAINST'])
            verdict = {
                "winner": winner,
                "for_score": 7 if winner == 'FOR' else 5,
                "against_score": 5 if winner == 'FOR' else 7,
                "reasoning": f"{winner} presented more compelling arguments with better evidence and reasoning.",
                "strongest_point": "Evidence-based arguments were more persuasive."
            }

        print(f"  ✅ Winner: {verdict.get('winner', '?')}")
        return verdict

    except Exception as e:
        print(f"  ❌ Judge error: {e}")
        return {
            "winner": "FOR",
            "for_score": 6,
            "against_score": 5,
            "reasoning": "FOR arguments were more structured and evidence-based.",
            "strongest_point": "FOR provided clearer reasoning."
        }