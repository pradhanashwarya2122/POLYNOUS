from typing import TypedDict, List, Dict, Optional, Any

class AgentState(TypedDict):
    # ── User input ────────────────────────────────────────
    query: str
    session_id: str

    # ── Authenticated user (from database) ────────────────
    user: Optional[Any]                   # ✅ ADD THIS — the full user model object

    # ── User preferences ──────────────────────────────────
    response_style: str                   # "academic", "casual", "eli5", "technical"
    preferred_provider: Optional[str]     # "anthropic" or "openai"

    # ── BYO API Key (decrypted) ───────────────────────────
    user_api_key: Optional[str]           # user's personal API key (or None)
    model: Optional[str]                  # user's chosen model for the provider

    # ── Search results ────────────────────────────────────
    retrieved_docs: List[Dict]

    # ── Summaries ─────────────────────────────────────────
    summaries: List[str]

    # ── Critique results ──────────────────────────────────
    critique: Dict[str, Any]
    critic_retries: int                   # graph-level retry counter (parse failures)

    # ── Computed diagnostics ──────────────────────────────
    computed_confidence: Optional[Dict]   # 4-factor evidence-based confidence

    # ── Final output ──────────────────────────────────────
    final_answer: str
    citations: List[Dict]

    # ── Debate mode ───────────────────────────────────────
    debate_mode: bool
    debate_history: List[Dict]
    judge_verdict: Optional[Dict]

    # ── Tracking ──────────────────────────────────────────
    errors: List[str]
    warnings: List[str]
    current_agent: str

    # ── Knowledge Graph ───────────────────────────────────
    graph_context: str
    graph_results: List[Dict]