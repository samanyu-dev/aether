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
            {"toolName": tool_name, "args": args or {}},
        )
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
    ):
        self.project = project
        self.endpoint = endpoint or os.getenv("AETHER_ENDPOINT", "http://localhost:8000")
        self.local = local
        self.verbose = verbose

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
