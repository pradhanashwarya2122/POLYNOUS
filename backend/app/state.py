from typing import TypedDict, List, Dict, Optional, Any

class AgentState(TypedDict):
    # User input
    query: str
    session_id: str

    # User preference (set from frontend or defaults to "academic")
    response_style: str

    # BYO API Key support
    user_api_key: Optional[str]          # decrypted user API key (or None)
    preferred_provider: Optional[str]    # "anthropic" or "openai"

    # Search results
    retrieved_docs: List[Dict]

    # Summaries
    summaries: List[str]

    # Critique results
    critique: Dict[str, Any]

    # Final output
    final_answer: str
    citations: List[Dict]

    # Debate mode
    debate_mode: bool
    debate_history: List[Dict]
    judge_verdict: Optional[Dict]

    # Tracking
    errors: List[str]
    warnings: List[str]
    current_agent: str

    # Knowledge Graph fields
    graph_context: str
    graph_results: List[Dict]