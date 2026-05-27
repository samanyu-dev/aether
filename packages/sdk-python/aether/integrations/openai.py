import time
from typing import Any, Dict, Optional
from datetime import datetime, timezone

def trace_openai(client: Any, tracer: Any) -> Any:
    """
    Wraps an OpenAI client's chat completions to automatically trace prompts, 
    tool calls, token latency, and completions into Aether.
    """
    original_create = client.chat.completions.create

    def traced_create(*args: Any, **kwargs: Dict[str, Any]) -> Any:
        session_name = kwargs.get("model", "openai-completion")
        agent_name = "OpenAI-Agent"
        
        # Start a dynamic Aether session
        with tracer.session(name=session_name, agent_name=agent_name) as session:
            # 1. Trace Prompt
            messages = kwargs.get("messages", [])
            prompt_content = ""
            if messages:
                # Format prompt nicely
                prompt_content = "\n".join(f"[{m.get('role', 'user')}]: {m.get('content', '')}" for m in messages)
            
            prompt_node = session.thought(
                content=f"Received completions request for model: {session_name}",
                confidence=1.0,
                metadata={"prompt": prompt_content}
            )

            start_time = time.time()
            try:
                # Call original openai API
                response = original_create(*args, **kwargs)
                latency_ms = int((time.time() - start_time) * 1000)
                
                # Check for choices and model outputs
                choices = getattr(response, "choices", [])
                if choices:
                    message = choices[0].message
                    content = getattr(message, "content", "")
                    tool_calls = getattr(message, "tool_calls", None)

                    # 2. Trace Tool Calls
                    if tool_calls:
                        for tc in tool_calls:
                            tc_id = tc.id
                            func_name = tc.function.name
                            func_args = tc.function.arguments
                            
                            t_call = session.tool_call(
                                tool_name=func_name,
                                args=func_args,
                                parent_id=prompt_node
                            )
                            # Simulating tool completion logging if model outputs it
                            session.tool_result(
                                parent_id=t_call,
                                result={"status": "called_by_openai", "id": tc_id},
                                latency_ms=10
                            )

                    # 3. Trace Final Completion Content
                    if content:
                        session.thought(
                            content=f"OpenAI Response choice:\n{content}",
                            parent_id=prompt_node,
                            confidence=0.99,
                            metadata={"tokens_used": getattr(response, "usage", {}).__dict__ if hasattr(response, "usage") else {}}
                        )
                        # Stream tokens to visually show final response completion in visualizer
                        session.stream_tokens(
                            tokens=[content],
                            parent_id=prompt_node,
                            delay=0.01
                        )
                return response
            except Exception as e:
                session.system(
                    content=f"OpenAI completion request failed: {e}",
                    parent_id=prompt_node
                )
                raise

    client.chat.completions.create = traced_create
    return client

instrument_openai = trace_openai

