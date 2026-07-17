"""
app/visual/events.py

Thread-safe progress bus bridging pipeline nodes (running in executor
threads) and the /ask-visual SSE async generator.

Producer side: sync code calls bus.emit(...) from any thread.
Consumer side: the async generator polls bus.drain() while the node runs.
"""
from __future__ import annotations

import queue
from typing import Optional


class ProgressBus:
    """Queue of {agent, msg, patch} events emitted mid-node."""

    def __init__(self):
        self.q: "queue.Queue[dict]" = queue.Queue()

    def emit(self, agent: str, msg: str, patch: Optional[dict] = None) -> None:
        self.q.put({"agent": agent, "msg": msg, "patch": patch or {}})

    def get_nowait(self) -> Optional[dict]:
        try:
            return self.q.get_nowait()
        except queue.Empty:
            return None


def make_emitter(state: dict, agent: str):
    """
    Bound emitter for one agent. No-op when no bus is attached to the state
    (plain /ask path, CLI, tests) so callbacks are always safe to call.
    """
    bus = state.get("_progress_bus")
    if bus is None:
        return lambda msg, patch=None: None
    return lambda msg, patch=None: bus.emit(agent, msg, patch)
