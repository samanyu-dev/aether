import time
from typing import Any, Dict, List, Optional
from uuid import UUID

# Defensive import fallback
try:
    from langchain.callbacks.base import BaseCallbackHandler
except ImportError:
    class BaseCallbackHandler:  # type: ignore
        pass

class AetherCallbackHandler(BaseCallbackHandler):
    """
    A native LangChain Callback Handler that automatically instruments and streams
    LLM prompt reasoning, tool invocations, token typewriter completions, and errors to Aether.
    """
    def __init__(self, tracer: Optional[Any] = None, agent_name: str = "LangChain-Agent"):
        if tracer is None:
            from aether import get_global_tracer
            tracer = get_global_tracer()
        self.tracer = tracer
        self.agent_name = agent_name
        self.session = None
        self.active_llm_node = None
        self.tool_nodes = {}
        self.latencies = {}

    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], *, run_id: UUID, **kwargs: Any
    ) -> None:
        # Initialize dynamic tracing session on LLM start
        if not self.session:
            model_name = serialized.get("name", "langchain-llm")
            self.session = self.tracer.start_session(
                name=f"langchain-{run_id.hex[:6]}",
                agent_name=self.agent_name
            )
        
        prompt_content = prompts[0] if prompts else "No prompt context"
        self.active_llm_node = self.session.thought(
            content=f"LLM Reasoning Start: {prompt_content[:60]}...",
            confidence=0.99,
            metadata={"full_prompt": prompt_content}
        )

    def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if self.session and self.active_llm_node:
            # Emit token directly to Next.js typewriter stream at 60fps
            self.session.token(
                content=token,
                parent_id=self.active_llm_node
            )

    def on_llm_end(self, response: Any, *, run_id: UUID, **kwargs: Any) -> None:
        if self.session and self.active_llm_node:
            choices = response.generations[0] if response.generations else []
            full_text = choices[0].text if choices else ""
            self.session.thought(
                content=f"LLM generated response:\n{full_text}",
                parent_id=self.active_llm_node,
                confidence=1.0
            )

    def on_tool_start(
        self, serialized: Dict[str, Any], input_str: str, *, run_id: UUID, **kwargs: Any
    ) -> None:
        if self.session:
            tool_name = serialized.get("name", "Tool")
            t_node = self.session.tool_call(
                tool_name=tool_name,
                arguments=input_str,
                parent_id=self.active_llm_node
            )
            self.tool_nodes[run_id] = t_node
            self.latencies[run_id] = time.time()

    def on_tool_end(self, output: Any, *, run_id: UUID, **kwargs: Any) -> None:
        t_node = self.tool_nodes.get(run_id)
        if self.session and t_node:
            start_time = self.latencies.get(run_id, time.time())
            latency_ms = int((time.time() - start_time) * 1000)
            
            self.session.tool_result(
                call_id=t_node,
                result=str(output),
                latency_ms=latency_ms
            )

    def on_tool_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> None:
        t_node = self.tool_nodes.get(run_id)
        if self.session and t_node:
            self.session.hallucination(
                content=f"Tool Execution Error: {str(error)}",
                parent_id=t_node,
                severity="high"
            )

    def on_chain_error(self, error: BaseException, *, run_id: UUID, **kwargs: Any) -> None:
        if self.session:
            self.session.system(
                content=f"Chain Error: {str(error)}"
            )
