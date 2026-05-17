"""
Aether Cognition Engine — Production Backend
=============================================
FastAPI backend with WebSocket broadcasting, session persistence,
replay APIs, and structured event schemas.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
import asyncio
import uuid
from datetime import datetime, timezone
from collections import defaultdict
import time

app = FastAPI(
    title="Aether Cognition Engine",
    description="Realtime AI observability and reasoning visualization backend",
    version="0.2.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Event Schemas ───────────────────────────────────────────────────────────

class AetherEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sessionId: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    type: str  # thought, tool_call, tool_result, memory, token, hallucination, agent_message, system
    parentId: Optional[str] = None
    content: Any
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SessionInfo(BaseModel):
    id: str
    name: Optional[str] = None
    createdAt: str
    lastEventAt: str
    eventCount: int
    agentName: Optional[str] = None
    status: str = "active"  # active, completed, error

class SessionDetail(BaseModel):
    session: SessionInfo
    events: List[AetherEvent]
    analytics: Dict[str, Any]

class BatchEvents(BaseModel):
    events: List[AetherEvent]

# ─── In-Memory Store ─────────────────────────────────────────────────────────

class CognitionStore:
    """In-memory store for cognition sessions and events.
    Designed to be swappable with PostgreSQL/Redis later."""

    def __init__(self):
        self.sessions: Dict[str, SessionInfo] = {}
        self.events: Dict[str, List[AetherEvent]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def record_event(self, event: AetherEvent) -> AetherEvent:
        async with self._lock:
            sid = event.sessionId
            # Auto-create session if not exists
            if sid not in self.sessions:
                self.sessions[sid] = SessionInfo(
                    id=sid,
                    name=event.metadata.get("sessionName", sid) if event.metadata else sid,
                    createdAt=event.timestamp,
                    lastEventAt=event.timestamp,
                    eventCount=0,
                    agentName=event.metadata.get("agentName") if event.metadata else None,
                )
            self.sessions[sid].lastEventAt = event.timestamp
            self.sessions[sid].eventCount += 1
            self.events[sid].append(event)
            
            # Phase 1 Stabilization: Cap backend memory to 5000 events per session
            if len(self.events[sid]) > 5000:
                self.events[sid] = self.events[sid][-5000:]
                
            return event

    def get_sessions(self) -> List[SessionInfo]:
        return sorted(
            self.sessions.values(),
            key=lambda s: s.lastEventAt,
            reverse=True,
        )

    def get_session(self, session_id: str) -> Optional[SessionInfo]:
        return self.sessions.get(session_id)

    def get_events(
        self,
        session_id: str,
        after: Optional[str] = None,
        event_types: Optional[List[str]] = None,
        limit: int = 1000,
    ) -> List[AetherEvent]:
        events = self.events.get(session_id, [])
        if after:
            events = [e for e in events if e.timestamp > after]
        if event_types:
            events = [e for e in events if e.type in event_types]
        return events[-limit:]

    def compute_analytics(self, session_id: str) -> Dict[str, Any]:
        events = self.events.get(session_id, [])
        if not events:
            return {}

        type_counts = defaultdict(int)
        for e in events:
            type_counts[e.type] += 1

        # Compute reasoning depth
        parent_map: Dict[str, List[str]] = defaultdict(list)
        for e in events:
            if e.parentId:
                parent_map[e.parentId].append(e.id)

        def depth(eid: str) -> int:
            children = parent_map.get(eid, [])
            if not children:
                return 0
            return 1 + max(depth(c) for c in children)

        roots = [e for e in events if not e.parentId]
        max_depth = max((depth(r.id) for r in roots), default=0)

        # Timeline duration
        timestamps = [e.timestamp for e in events]
        duration_ms = 0
        if len(timestamps) >= 2:
            try:
                t_start = datetime.fromisoformat(timestamps[0].replace("Z", "+00:00"))
                t_end = datetime.fromisoformat(timestamps[-1].replace("Z", "+00:00"))
                duration_ms = int((t_end - t_start).total_seconds() * 1000)
            except Exception:
                pass

        return {
            "totalEvents": len(events),
            "typeCounts": dict(type_counts),
            "reasoningDepth": max_depth,
            "durationMs": duration_ms,
            "tokenCount": type_counts.get("token", 0),
            "toolCalls": type_counts.get("tool_call", 0),
            "hallucinations": type_counts.get("hallucination", 0),
            "memoryAccesses": type_counts.get("memory", 0),
        }


store = CognitionStore()

# ─── Connection Manager ──────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.session_subscriptions: Dict[str, List[WebSocket]] = defaultdict(list)
        self.global_subscribers: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, session_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if session_id:
            self.session_subscriptions[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for sid in list(self.session_subscriptions.keys()):
            if websocket in self.session_subscriptions[sid]:
                self.session_subscriptions[sid].remove(websocket)
        if websocket in self.global_subscribers:
            self.global_subscribers.remove(websocket)

    async def broadcast_to_session(self, session_id: str, event: AetherEvent):
        message = event.model_dump_json()
        dead: List[WebSocket] = []
        for conn in self.session_subscriptions.get(session_id, []):
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.disconnect(d)

    async def broadcast_global(self, data: dict):
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for conn in self.global_subscribers:
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()

# ─── REST Endpoints ──────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "online",
        "platform": "Aether Cognition Engine",
        "version": "0.2.0",
        "sessions": len(store.sessions),
        "connections": len(manager.active_connections),
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "uptime": time.time()}

# ── Events ──

@app.post("/events")
async def receive_event(event: AetherEvent):
    """Receive and broadcast a single cognition event."""
    recorded = await store.record_event(event)
    await manager.broadcast_to_session(event.sessionId, recorded)
    # Notify global subscribers about session update
    await manager.broadcast_global({
        "type": "session_update",
        "sessionId": event.sessionId,
        "eventType": event.type,
    })
    return {"status": "success", "event_id": recorded.id}

@app.post("/events/batch")
async def receive_batch(batch: BatchEvents):
    """Receive a batch of events for efficient transport."""
    results = []
    for event in batch.events:
        recorded = await store.record_event(event)
        await manager.broadcast_to_session(event.sessionId, recorded)
        results.append(recorded.id)
    return {"status": "success", "count": len(results), "event_ids": results}

# ── Sessions ──

@app.get("/sessions", response_model=List[SessionInfo])
async def list_sessions():
    """List all cognition sessions."""
    return store.get_sessions()

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get full session detail with events and analytics."""
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    events = store.get_events(session_id)
    analytics = store.compute_analytics(session_id)
    return SessionDetail(session=session, events=events, analytics=analytics)

@app.get("/sessions/{session_id}/events", response_model=List[AetherEvent])
async def get_session_events(
    session_id: str,
    after: Optional[str] = Query(None, description="ISO timestamp to get events after"),
    types: Optional[str] = Query(None, description="Comma-separated event types"),
    limit: int = Query(1000, ge=1, le=5000),
):
    """Get events for a session with optional filtering."""
    event_types = types.split(",") if types else None
    return store.get_events(session_id, after=after, event_types=event_types, limit=limit)

@app.get("/sessions/{session_id}/analytics")
async def get_session_analytics(session_id: str):
    """Get analytics for a specific session."""
    if session_id not in store.sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return store.compute_analytics(session_id)

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its events."""
    if session_id in store.sessions:
        del store.sessions[session_id]
        if session_id in store.events:
            del store.events[session_id]
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Session not found")

# ─── WebSocket Endpoints ─────────────────────────────────────────────────────

@app.websocket("/ws/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str):
    """Subscribe to realtime events for a specific session."""
    await manager.connect(websocket, session_id)
    try:
        # Send existing events for replay
        existing = store.get_events(session_id)
        if existing:
            await websocket.send_text(json.dumps({
                "type": "replay",
                "events": [e.model_dump() for e in existing],
            }))
        while True:
            data = await websocket.receive_text()
            # Handle client messages (ping, subscribe changes, etc.)
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws")
async def websocket_global(websocket: WebSocket):
    """Global WebSocket for session list updates."""
    await manager.connect(websocket)
    manager.global_subscribers.append(websocket)
    try:
        # Send current session list
        sessions = store.get_sessions()
        await websocket.send_text(json.dumps({
            "type": "session_list",
            "sessions": [s.model_dump() for s in sessions],
        }))
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
