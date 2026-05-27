"""
Aether Python SDK
=================
Instrument your AI agents with cinematic observability.

Usage:
    from aether import AgentTracer

    tracer = AgentTracer(project="my-project")

    with tracer.session("research-agent") as session:
        session.thought("Analyzing user intent")
        tool_id = session.tool_call("web_search", {"query": "latest AI research"})
        session.tool_result(tool_id, {"results": 5})
        session.stream_tokens(["Hello", " world"])
"""
import requests
import uuid
import time
import functools
import threading
import json
import os
from datetime import datetime, timezone
from typing import Any, Optional, Dict, List, Callable
from contextlib import contextmanager


class AetherSession:
    """Represents a single tracing session for an agent."""

    def __init__(self, sdk: "AgentTracer", session_id: str, agent_name: str = ""):
        self.sdk = sdk
        self.session_id = session_id
        self.agent_name = agent_name or session_id
        self._event_buffer: List[dict] = []
        self._all_events: List[dict] = []
        self._buffer_lock = threading.Lock()
        
        # Setup local trace folder if enabled
        if self.sdk.local:
            os.makedirs(os.path.join(".aether", "traces"), exist_ok=True)
            os.makedirs(os.path.join(".aether", "sessions"), exist_ok=True)
            os.makedirs(os.path.join(".aether", "cache"), exist_ok=True)
            
        self._flush_interval = 0.5  # seconds
        self._running = True
        self._flush_thread = threading.Thread(target=self._auto_flush, daemon=True)
        self._flush_thread.start()

    def get_event(self, event_id: str) -> Optional[dict]:
        with self._buffer_lock:
            for e in self._all_events:
                if e["id"] == event_id:
                    return e
        return None

    def _handle_breakpoint(self, event: dict) -> dict:
        """Checks if a breakpoint should trigger, holds the thread, and mutates event content."""
        if not getattr(self.sdk, "breakpoints_enabled", False):
            return event

        if not self.sdk.endpoint or ("localhost" not in self.sdk.endpoint and "127.0.0.1" not in self.sdk.endpoint):
            return event

        if event["type"] not in ("thought", "tool_call"):
            return event

        node_id = event["id"]
        try:
            # 1. Ask the backend if a breakpoint is triggered for this event type/metadata
            eval_payload = {
                "type": event["type"],
                "content": event["content"],
                "metadata": event.get("metadata", {})
            }
            eval_url = f"{self.sdk.endpoint}/sessions/{self.session_id}/breakpoints/{node_id}/evaluate"
            res = requests.post(eval_url, json=eval_payload, timeout=2)
            if res.status_code == 200:
                action_data = res.json()
                if action_data.get("action") == "action_pause" or action_data.get("action") == "pause":
                    print(f"\n🌌 [Aether Debugger] Reasoning Breakpoint hit at '{event['type']}' node [{node_id}].")
                    print(f"   Paused details: {event['content']}")
                    if event["type"] == "tool_call":
                        print(f"   Tool Arguments: {event.get('metadata', {}).get('args')}")
                    print("   Waiting for operator review inside VS Code / Web Replay Console...")

                    # 2. Call hold (blocks synchronously until operator resumes or rejects)
                    hold_url = f"{self.sdk.endpoint}/sessions/{self.session_id}/breakpoints/{node_id}/hold"
                    hold_res = requests.post(hold_url, json=event, timeout=120)  # 2 minutes operator timeout
                    
                    if hold_res.status_code == 200:
                        hold_data = hold_res.json()
                        if hold_data.get("status") == "rejected":
                            print("❌ [Aether Debugger] Execution REJECTED by human operator.")
                            raise RuntimeError(f"Execution rejected by operator at node {node_id}")
                        elif hold_data.get("status") == "resumed":
                            mutated_data = hold_data.get("payload", {})
                            mutated_event = event.copy()
                            for k, v in mutated_data.items():
                                if k == "metadata" and isinstance(v, dict) and "metadata" in mutated_event:
                                    mutated_event["metadata"] = mutated_event["metadata"].copy()
                                    mutated_event["metadata"].update(v)
                                else:
                                    mutated_event[k] = v
                            print("▶ [Aether Debugger] Execution RESUMED with payload updates.")
                            return mutated_event
        except requests.exceptions.RequestException:
            pass
        
        return event

    def _make_event(
        self,
        event_type: str,
        content: Any,
        parent_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> dict:
        return {
            "id": str(uuid.uuid4()),
            "sessionId": self.session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
            "parentId": parent_id,
            "content": content,
            "metadata": {
                **(metadata or {}),
                "agentName": self.agent_name,
                "sessionName": self.session_id,
            },
        }

    def _write_local_trace(self):
        """Atomically dump all current session events to local JSON file."""
        if not self.sdk.local:
            return
        try:
            filepath = os.path.join(".aether", "traces", f"session_{self.session_id}.json")
            with self._buffer_lock:
                events_copy = self._all_events.copy()
            trace_data = {
                "session_id": self.session_id,
                "agent_name": self.agent_name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_count": len(events_copy),
                "events": events_copy
            }
            with open(filepath, "w") as f:
                json.dump(trace_data, f, indent=2)
        except Exception as e:
            if self.sdk.verbose:
                print(f"[Aether SDK] Failed to write local trace: {e}")

    def _emit(self, event: dict) -> str:
        with self._buffer_lock:
            self._event_buffer.append(event)
            self._all_events.append(event)
        if self.sdk.local:
            self._write_local_trace()
        return event["id"]

    def _emit_immediate(self, event: dict) -> str:
        """Send immediately without buffering."""
        with self._buffer_lock:
            self._all_events.append(event)
        if self.sdk.local:
            self._write_local_trace()
        self._send_events([event])
        return event["id"]

    def _send_events(self, events: List[dict]):
        # Skip server request if we are in pure offline mode without backend running
        if not self.sdk.endpoint or "localhost" in self.sdk.endpoint:
            # Check if backend is alive before making blocking requests
            return
        try:
            if len(events) == 1:
                requests.post(
                    f"{self.sdk.endpoint}/events",
                    json=events[0],
                    timeout=1,
                )
            else:
                requests.post(
                    f"{self.sdk.endpoint}/events/batch",
                    json={"events": events},
                    timeout=2,
                )
        except Exception:
            pass

    def _auto_flush(self):
        while self._running:
            time.sleep(self._flush_interval)
            self.flush()

    def flush(self):
        with self._buffer_lock:
            if not self._event_buffer:
                return
            batch = self._event_buffer.copy()
            self._event_buffer.clear()
        self._send_events(batch)

    def close(self):
        self._running = False
        self.flush()
        if self.sdk.local:
            self._write_local_trace()

    # ── High-Level API ──────────────────────────────────────────────────

    def thought(
        self,
        content: str,
        parent_id: Optional[str] = None,
        confidence: Optional[float] = None,
        metadata: Optional[Dict] = None,
    ) -> str:
        meta = metadata or {}
        if confidence is not None:
            meta["confidence"] = confidence
        event = self._make_event("thought", content, parent_id, meta)
        event = self._handle_breakpoint(event)
        return self._emit(event)

    def tool_call(
        self,
        tool_name: str,
        args: Optional[Dict] = None,
        parent_id: Optional[str] = None,
    ) -> str:
        event = self._make_event(
            "tool_call",
            f"Calling {tool_name}",
            parent_id,
            {"toolName": tool_name, "args": dict(args) if args else {}},
        )
        event = self._handle_breakpoint(event)
        if args is not None and "metadata" in event and "args" in event["metadata"]:
            args.clear()
            args.update(event["metadata"]["args"])
        return self._emit(event)

    def tool_result(
        self,
        parent_id: str,
        result: Any,
        latency_ms: Optional[int] = None,
        success: bool = True,
    ) -> str:
        meta: Dict[str, Any] = {"success": success}
        if latency_ms is not None:
            meta["latency"] = latency_ms
        content = result if isinstance(result, str) else json.dumps(result)[:500]
        event = self._make_event("tool_result", content, parent_id, meta)
        return self._emit(event)

    def memory(
        self,
        content: str,
        parent_id: Optional[str] = None,
        source: str = "vector_store",
    ) -> str:
        event = self._make_event(
            "memory", content, parent_id, {"source": source}
        )
        return self._emit(event)

    def hallucination(
        self,
        content: str,
        parent_id: Optional[str] = None,
        severity: str = "warning",
    ) -> str:
        event = self._make_event(
            "hallucination", content, parent_id, {"severity": severity}
        )
        return self._emit_immediate(event)

    def stream_tokens(
        self,
        tokens: List[str],
        parent_id: Optional[str] = None,
        delay: float = 0.05,
    ):
        for token in tokens:
            event = self._make_event("token", token, parent_id)
            self._emit_immediate(event)
            time.sleep(delay)

    def agent_message(
        self,
        content: str,
        from_agent: str = "",
        to_agent: str = "",
        parent_id: Optional[str] = None,
    ) -> str:
        event = self._make_event(
            "agent_message",
            content,
            parent_id,
            {"fromAgent": from_agent, "toAgent": to_agent},
        )
        return self._emit(event)

    def system(self, content: str, parent_id: Optional[str] = None) -> str:
        event = self._make_event("system", content, parent_id)
        return self._emit(event)


class AgentTracer:
    """Main entry point for Aether SDK instrumentation."""

    def __init__(
        self,
        project: str = "default",
        endpoint: Optional[str] = None,
        local: bool = True,
        verbose: bool = True,
        breakpoints_enabled: bool = True,
    ):
        self.project = project
        self.endpoint = endpoint or os.getenv("AETHER_ENDPOINT", "http://localhost:8000")
        self.local = local
        self.verbose = verbose
        self.breakpoints_enabled = breakpoints_enabled

    def start_session(self, name: str, agent_name: str = "", session_id: str = None) -> AetherSession:
        if not session_id:
            session_id = f"{self.project}-{name}-{uuid.uuid4().hex[:8]}"
        sess = AetherSession(self, session_id, agent_name or name)
        if self.verbose:
            print(f"[Aether] Non-context session started: {session_id}")
        return sess

    @contextmanager
    def session(self, name: str, agent_name: str = "", session_id: str = None):
        if not session_id:
            session_id = f"{self.project}-{name}-{uuid.uuid4().hex[:8]}"
        sess = AetherSession(self, session_id, agent_name or name)
        if self.verbose:
            print(f"[Aether] Session started: {session_id}")
        try:
            yield sess
        finally:
            sess.close()
            if self.verbose:
                print(f"[Aether] Session closed: {session_id}")

    def observe(self, func: Callable) -> Callable:
        """Decorator to auto-trace a function."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            with self.session(func.__name__) as session:
                session.thought(f"Executing {func.__name__}")
                start = time.time()
                try:
                    result = func(*args, session=session, **kwargs)
                    elapsed = int((time.time() - start) * 1000)
                    session.thought(
                        f"Completed {func.__name__} in {elapsed}ms",
                        metadata={"latency": elapsed},
                    )
                    return result
                except Exception as e:
                    session.hallucination(
                        f"Error in {func.__name__}: {str(e)}",
                        severity="critical",
                    )
                    raise
        return wrapper


# ── Legacy compatibility ──

class AetherSDK:
    """Legacy SDK interface for backward compatibility."""

    def __init__(self, endpoint: Optional[str] = None):
        self.endpoint = endpoint or os.getenv("AETHER_ENDPOINT", "http://localhost:8000")
        self.session_id = str(uuid.uuid4())

    def emit(self, event_type: str, content: Any, parent_id: Optional[str] = None, metadata: Optional[Dict] = None):
        event = {
            "id": str(uuid.uuid4()),
            "sessionId": self.session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
            "parentId": parent_id,
            "content": content,
            "metadata": metadata or {},
        }
        try:
            requests.post(f"{self.endpoint}/events", json=event, timeout=5)
        except Exception as e:
            print(f"[Aether SDK] Failed to send event: {e}")
        return event["id"]
