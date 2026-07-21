"""
app/visual/graph_stream.py

Streams a COMPILED LangGraph graph over SSE — the single shared mechanism
used by /ask, /ask-stream, /ask-visual and /debate-visual. This replaces
the old hand-rolled "loop over node functions manually" pattern: all
conditional routing (no-docs bail, critic parse-failure retry, the
gap-driven deepen loop, debate rebuttal ordering) now lives ONLY inside
the graph definitions (create_orchestrator / create_debate_graph) and is
exercised for real every time a request streams.

How node boundaries are discovered
-----------------------------------
LangGraph's `stream_mode="debug"` yields a `"task"` event the instant a
node is about to run and a `"task_result"` event the instant it finishes
(with the node's full return value) — this is the graph's own
authoritative signal of "which node is executing right now", not a
guess or a duplicated pipeline list. Verified empirically: a node visited
twice (retry/deepen loops) fires two independent task/task_result pairs,
in order, and an exception raised inside a node propagates directly out
of the `.stream()` generator.

Threading
---------
`graph.stream()` is a synchronous generator, so it runs in a background
thread; debug events are handed back to the calling asyncio loop through
a plain thread-safe `queue.Queue`. The fine-grained ProgressBus (mid-node
scrape-by-scrape / summarise-by-summarise events) is drained concurrently
so nothing about the live "Live Thought Stream" UX changes.

IMPORTANT — state schema note
------------------------------
LangGraph strips any state key not declared in the AgentState TypedDict
between steps (verified empirically). `_progress_bus` is declared in
AgentState specifically so the SAME ProgressBus object survives across
every node in the graph — do not remove it from state.py.
"""
from __future__ import annotations

import asyncio
import queue
import time
from typing import Callable, Optional


def _run_graph_in_thread(graph, initial_state: dict, out_q: "queue.Queue") -> None:
    """Runs entirely in a worker thread. Forwards every debug event onto
    out_q, then a 'done' sentinel, or an 'error' sentinel on failure."""
    try:
        for ev in graph.stream(initial_state, stream_mode="debug"):
            out_q.put(("event", ev))
        out_q.put(("done", None))
    except Exception as e:
        out_q.put(("error", e))


async def stream_compiled_graph(
    loop: asyncio.AbstractEventLoop,
    graph,
    state: dict,
    bus,
    on_task: Callable[[str], Optional[str]],
    on_task_result: Callable[[str, float], Optional[str]],
    on_bus_event: Callable[[dict], str],
    start_time: float,
    on_error: Optional[Callable[[str, Exception], str]] = None,
):
    """
    Async generator yielding raw SSE `data: ...\\n\\n` strings while a
    compiled LangGraph graph runs to completion.

    Mutates `state` (the caller's own dict) in place via `.update()` on
    every node's result, so after this generator is exhausted the caller's
    `state` holds the final merged state — exactly like the old manual
    `state.update(node_fn(state))` pattern, just driven by the graph.

    Args:
        graph:          a compiled LangGraph graph (StateGraph(...).compile())
        state:          the running state dict (mutated in place)
        bus:             the ProgressBus already stashed at state["_progress_bus"]
        on_task:        (node_name) -> announce SSE frame, or None to skip
        on_task_result: (node_name, elapsed_seconds) -> completion SSE frame,
                        called AFTER `state` has been updated with the node's
                        return value
        on_bus_event:   (raw bus event dict) -> SSE frame string
        on_error:       (last_node_name, exception) -> SSE error frame;
                        defaults to a generic '{node} agent failed: {msg}' frame
    """
    if on_error is None:
        def on_error(node_name, exc):
            import json
            label = node_name or "pipeline"
            return f"data: {json.dumps({'error': f'{label} agent failed: {str(exc)[:200]}'})}\n\n"

    out_q: "queue.Queue" = queue.Queue()
    future = loop.run_in_executor(None, _run_graph_in_thread, graph, state, out_q)
    last_node_name = None

    while True:
        # Fine-grained mid-node events take priority so progress never stalls.
        ev = bus.get_nowait()
        if ev is not None:
            yield on_bus_event(ev)
            continue

        try:
            kind, payload = out_q.get_nowait()
        except queue.Empty:
            if future.done():
                # graph finished — drain whatever bus events trailed it
                ev = bus.get_nowait()
                if ev is not None:
                    yield on_bus_event(ev)
                    continue
                break
            await asyncio.sleep(0.05)
            continue

        if kind == "error":
            # Bookkeeping the caller can check after the generator ends
            # (an async generator can't hand back a return value cleanly
            # through `async for`) — mirrors the old `_node_failed` flag.
            state["_stream_error"] = True
            yield on_error(last_node_name, payload)
            return
        if kind == "done":
            break

        # kind == "event" — a LangGraph debug event
        debug_ev = payload
        name = debug_ev["payload"].get("name")
        if debug_ev["type"] == "task":
            last_node_name = name
            frame = on_task(name)
            if frame:
                yield frame
        elif debug_ev["type"] == "task_result":
            result = debug_ev["payload"].get("result") or {}
            state.update(result)
            elapsed = time.time() - start_time
            frame = on_task_result(name, elapsed)
            if frame:
                yield frame
