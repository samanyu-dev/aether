import functools
from typing import Any, Dict, List, Optional, Union

def instrument_autogen(agent: Any, tracer: Any) -> Any:
    """
    Instruments a Microsoft AutoGen ConversableAgent instance.
    Intercepts its sending and receiving pipelines to record agent-to-agent
    cognitive conversations natively within Aether.
    """
    original_send = agent.send
    original_receive = agent.receive

    @functools.wraps(original_send)
    def traced_send(
        message: Union[Dict, str],
        recipient: Any,
        request_reply: Optional[bool] = None,
        silent: Optional[bool] = False,
    ) -> Any:
        session_name = f"autogen-{agent.name}-to-{recipient.name}"
        with tracer.session(name=session_name, agent_name=agent.name) as session:
            content_str = message if isinstance(message, str) else message.get("content", "")
            session.agent_message(
                content=content_str,
                from_agent=agent.name,
                to_agent=recipient.name
            )
        return original_send(message, recipient, request_reply, silent)

    @functools.wraps(original_receive)
    def traced_receive(
        message: Union[Dict, str],
        sender: Any,
        request_reply: Optional[bool] = None,
        silent: Optional[bool] = False,
    ) -> Any:
        session_name = f"autogen-{agent.name}-from-{sender.name}"
        with tracer.session(name=session_name, agent_name=agent.name) as session:
            content_str = message if isinstance(message, str) else message.get("content", "")
            session.agent_message(
                content=content_str,
                from_agent=sender.name,
                to_agent=agent.name
            )
        return original_receive(message, sender, request_reply, silent)

    agent.send = traced_send
    agent.receive = traced_receive
    return agent
