import time
from typing import Any, Dict, List, Optional
from uuid import UUID
from .langchain import AetherCallbackHandler

class AetherLangGraphTracer(AetherCallbackHandler):
    """
    A custom tracer for LangGraph workflows. 
    Inherits from the core Aether LangChain Callback Handler to leverage 
    existing standard callback triggers, while standardizing dynamic session
    naming and node properties for StateGraph steps.
    """
    def __init__(self, tracer: Any, graph_name: str = "LangGraph-Workflow"):
        super().__init__(tracer, agent_name=graph_name)
        self.graph_name = graph_name

    def on_chain_start(
        self, serialized: Dict[str, Any], inputs: Dict[str, Any], *, run_id: UUID, **kwargs: Any
    ) -> None:
        # Standardize session creation for the active graph workflow run
        if not self.session:
            self.session = self.tracer.start_session(
                name=f"langgraph-{run_id.hex[:6]}",
                agent_name=self.graph_name
            )
        
        # Log graph execution entry node
        self.active_llm_node = self.session.thought(
            content=f"Starting Graph Execution: {self.graph_name}",
            metadata={"inputs": str(inputs)[:500]}
        )

    def on_chain_end(self, outputs: Dict[str, Any], *, run_id: UUID, **kwargs: Any) -> None:
        if self.session and self.active_llm_node:
            self.session.thought(
                content=f"Finished Graph Execution. Result produced.",
                parent_id=self.active_llm_node,
                metadata={"outputs": str(outputs)[:500]}
            )
