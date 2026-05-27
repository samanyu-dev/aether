import time
from typing import Any, Dict, List, Optional

try:
    from llama_index.core.callbacks import BaseCallbackHandler, CBEventType
except ImportError:
    try:
        from llama_index.callbacks import BaseCallbackHandler, CBEventType  # type: ignore
    except ImportError:
        # Fallback defensive mock if LlamaIndex is not locally installed
        class BaseCallbackHandler:  # type: ignore
            pass
        class CBEventType:  # type: ignore
            LLM = "llm"
            RETRIEVE = "retrieve"
            EMBEDDING = "embedding"
            QUERY = "query"

class AetherLlamaIndexCallbackHandler(BaseCallbackHandler):
    """
    A custom callback handler for LlamaIndex index searches, document retrievals,
    embedding lookups, query sequences, and model cycles.
    """
    def __init__(self, tracer: Optional[Any] = None, agent_name: str = "LlamaIndex-Agent"):
        if hasattr(super(), "__init__"):
            super().__init__(event_starts_to_ignore=[], event_ends_to_ignore=[])
        if tracer is None:
            from aether import get_global_tracer
            tracer = get_global_tracer()
        self.tracer = tracer
        self.agent_name = agent_name
        self.session = None
        self.active_nodes = {}
        self.latencies = {}

    def on_event_start(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        **kwargs: Any,
    ) -> str:
        if not self.session:
            self.session = self.tracer.start_session(
                name=f"llamaindex-{event_id[:6]}",
                agent_name=self.agent_name
            )

        self.latencies[event_id] = time.time()

        if event_type == CBEventType.QUERY:
            query_str = payload.get("query_str", "") if payload else "Query"
            node = self.session.thought(
                content=f"Query Input: {query_str}",
                metadata={"event_type": "query"}
            )
            self.active_nodes[event_id] = node
        elif event_type == CBEventType.RETRIEVE:
            node = self.session.memory(
                content="Retrieving relevant context from index...",
                source="llama_index_vector_store"
            )
            self.active_nodes[event_id] = node
        elif event_type == CBEventType.LLM:
            prompt = payload.get("formatted_prompt", "") if payload else "LLM prompt"
            node = self.session.thought(
                content=f"LLM Reasoning Start: {prompt[:60]}...",
                metadata={"prompt": prompt}
            )
            self.active_nodes[event_id] = node
        elif event_type == CBEventType.EMBEDDING:
            node = self.session.system(
                content="Generating embeddings for query vector match..."
            )
            self.active_nodes[event_id] = node
        else:
            node = self.session.system(
                content=f"LlamaIndex Event: {event_type}"
            )
            self.active_nodes[event_id] = node

        return event_id

    def on_event_end(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        **kwargs: Any,
    ) -> None:
        node = self.active_nodes.get(event_id)
        if not self.session or not node:
            return

        latency_ms = int((time.time() - self.latencies.get(event_id, time.time())) * 1000)

        if event_type == CBEventType.RETRIEVE and payload:
            nodes = payload.get("nodes", [])
            retrieved_text = "\n\n".join([
                f"[Node {i} - Score: {getattr(n, 'score', 0)}]: {getattr(n, 'node', n).get_content()[:200]}..." 
                for i, n in enumerate(nodes) if hasattr(n, 'node') or hasattr(n, 'get_content')
            ])
            self.session.tool_result(
                parent_id=node,
                result=retrieved_text or "No context retrieved",
                latency_ms=latency_ms
            )
        elif event_type == CBEventType.LLM and payload:
            response = payload.get("response")
            response_text = str(response) if response else "Empty response"
            self.session.thought(
                content=f"LLM generated response:\n{response_text[:300]}...",
                parent_id=node,
                metadata={"latency": latency_ms}
            )
        elif event_type == CBEventType.QUERY and payload:
            response = payload.get("response")
            self.session.thought(
                content=f"Final Answer: {str(response)[:300]}...",
                parent_id=node,
                metadata={"latency": latency_ms}
            )
        else:
            self.session.system(
                content=f"Completed {event_type} in {latency_ms}ms",
                parent_id=node
            )
