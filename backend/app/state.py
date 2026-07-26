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
    max_results: Optional[int]            # user-chosen number of sources to scrape

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
    research_cycles: int                  # gap-driven deepen loop counter (bounded)

    # ── Computed diagnostics ──────────────────────────────
    computed_confidence: Optional[Dict]   # 4-factor evidence-based confidence

    # ── Final output ──────────────────────────────────────
    final_answer: str
    citations: List[Dict]
    report: Optional[Dict]                # structured writer JSON contract (Phase 3)

    # ── Cost / token telemetry (Phase 6) ──────────────────
    usage: Optional[Dict]                 # per-request token/cost accumulator

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

    # ── Live-stream plumbing ───────────────────────────────
    # MUST be declared here: LangGraph strips any state key not present
    # in this TypedDict between node steps (verified empirically), so
    # without this the ProgressBus reference would vanish after the
    # first node and every make_emitter() call downstream would go silent.
    _progress_bus: Optional[Any]