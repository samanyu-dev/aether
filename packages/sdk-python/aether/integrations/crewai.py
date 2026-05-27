import time
from typing import Any, Dict, List, Optional
from uuid import UUID

try:
    from langchain.callbacks.base import BaseCallbackHandler
except ImportError:
    class BaseCallbackHandler:  # type: ignore
        pass

class AetherCrewAICallbackHandler(BaseCallbackHandler):
    """
    A custom callback handler for CrewAI execution loops. 
    Traces individual Agent thought structures, tool calls, results, and overall crew missions.
    """
    def __init__(self, tracer: Any, crew_name: str = "CrewAI-Mission"):
        self.tracer = tracer
        self.crew_name = crew_name
        self.session = None
        self.active_agent_node = None
        self.tool_nodes = {}
        self.latencies = {}

    def on_agent_action(self, action: Any, **kwargs: Any) -> Any:
        # Start Aether session dynamically on the first action if not already active
        if not self.session:
            agent_name = getattr(action, "tool", "CrewAI-Agent")
            self.session = self.tracer.start_session(
                name=f"crewai-{self.crew_name.lower().replace(' ', '-')}",
                agent_name=agent_name
            )
        
        log_text = getattr(action, "log", "")
        self.active_agent_node = self.session.thought(
            content=f"Agent Decision Loop:\n{log_text}",
            metadata={"agent": getattr(action, "tool", "CrewAI-Agent")}
        )

    def on_tool_start(
        self, serialized: Dict[str, Any], input_str: str, *, run_id: UUID, **kwargs: Any
    ) -> None:
        if self.session:
            tool_name = serialized.get("name", "Tool")
            t_node = self.session.tool_call(
                tool_name=tool_name,
                args={"input": input_str},
                parent_id=self.active_agent_node
            )
            self.tool_nodes[run_id] = t_node
            self.latencies[run_id] = time.time()

    def on_tool_end(self, output: Any, *, run_id: UUID, **kwargs: Any) -> None:
        t_node = self.tool_nodes.get(run_id)
        if self.session and t_node:
            start_time = self.latencies.get(run_id, time.time())
            latency_ms = int((time.time() - start_time) * 1000)
            
            self.session.tool_result(
                parent_id=t_node,
                result=str(output),
                latency_ms=latency_ms
            )

    def on_agent_finish(self, finish: Any, **kwargs: Any) -> Any:
        if self.session and self.active_agent_node:
            output_text = getattr(finish, "return_values", "")
            self.session.thought(
                content=f"Agent Output Summary:\n{output_text}",
                parent_id=self.active_agent_node
            )
