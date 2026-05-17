import json
import uuid
import os
from datetime import datetime, timezone

# Locate absolute recordings directory relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RECORDINGS_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../../recordings"))

def generate_id():
    return str(uuid.uuid4())

def get_time():
    return datetime.now(timezone.utc).isoformat()

def write_demo(filename, events):
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    filepath = os.path.join(RECORDINGS_DIR, filename)
    with open(filepath, "w") as f:
        json.dump({"events": events}, f, indent=2)
    print(f"Generated {filepath}")

def build_simple_reasoning():
    events = []
    sid = "simple-reasoning-demo"
    
    root_id = generate_id()
    events.append({
        "id": root_id, "sessionId": sid, "timestamp": get_time(),
        "type": "thought", "parentId": None, "content": "Analyzing user request: 'Explain quantum computing simply'",
        "metadata": {"confidence": 0.99, "agentName": "TutorGPT"}
    })
    
    t1_id = generate_id()
    events.append({
        "id": t1_id, "sessionId": sid, "timestamp": get_time(),
        "type": "thought", "parentId": root_id, "content": "Breaking down core concepts: Superposition and Entanglement.",
        "metadata": {"confidence": 0.95}
    })
    
    final_id = generate_id()
    events.append({
        "id": final_id, "sessionId": sid, "timestamp": get_time(),
        "type": "thought", "parentId": t1_id, "content": "Formulating physical analogy: A spinning coin instead of heads or tails.",
        "metadata": {"confidence": 0.92}
    })
    
    sys_id = generate_id()
    events.append({
        "id": sys_id, "sessionId": sid, "timestamp": get_time(),
        "type": "system", "parentId": root_id, "content": "Response generation complete.",
        "metadata": {}
    })
    
    write_demo("simple_reasoning.json", events)


def build_tool_agent():
    events = []
    sid = "tool-agent-demo"
    
    root_id = generate_id()
    events.append({
        "id": root_id, "sessionId": sid, "timestamp": get_time(),
        "type": "thought", "parentId": None, "content": "Objective: Find recent papers on LoRA fine-tuning.",
        "metadata": {"confidence": 0.98, "agentName": "ResearchGPT"}
    })
    
    mem_id = generate_id()
    events.append({
        "id": mem_id, "sessionId": sid, "timestamp": get_time(),
        "type": "memory", "parentId": root_id, "content": "Recalling user preference: prefers CVPR and NeurIPS venues.",
        "metadata": {"source": "pinecone-vector-db"}
    })
    
    tool1_id = generate_id()
    events.append({
        "id": tool1_id, "sessionId": sid, "timestamp": get_time(),
        "type": "tool_call", "parentId": root_id, "content": "Querying arXiv search index...",
        "metadata": {"toolName": "arxiv_search", "query": "LoRA OR Low-Rank Adaptation"}
    })
    
    res1_id = generate_id()
    events.append({
        "id": res1_id, "sessionId": sid, "timestamp": get_time(),
        "type": "tool_result", "parentId": tool1_id, "content": "Found 14 relevant papers. Top match: 'QLoRA: Efficient Finetuning'",
        "metadata": {"latency": 342, "results_count": 14}
    })
    
    final_id = generate_id()
    events.append({
        "id": final_id, "sessionId": sid, "timestamp": get_time(),
        "type": "thought", "parentId": res1_id, "content": "Synthesizing research summary and generating markdown report.",
        "metadata": {"confidence": 0.96}
    })
    
    write_demo("tool_agent.json", events)


def build_hallucination_repair():
    events = []
    sid = "hallucination-demo"
    
    root_id = generate_id()
    events.append({
        "id": root_id, "sessionId": sid, "timestamp": get_time(),
        "type": "thought", "parentId": None, "content": "Generating DevOps Python script to clean up old log files.",
        "metadata": {"confidence": 0.99, "agentName": "DevOpsGPT"}
    })
    
    tool_id = generate_id()
    events.append({
        "id": tool_id, "sessionId": sid, "timestamp": get_time(),
        "type": "tool_call", "parentId": root_id, "content": "Proposing server execution command.",
        "metadata": {"toolName": "bash_run", "command": "rm -rf /var/log/*"}
    })
    
    warn_id = generate_id()
    events.append({
        "id": warn_id, "sessionId": sid, "timestamp": get_time(),
        "type": "hallucination", "parentId": tool_id, "content": "CRITICAL SAFETY VIOLATION: Agent is attempting destructive wildcard deletion on root without validation.",
        "metadata": {"severity": "high", "detector": "Aether Guardrails"}
    })
    
    repair_id = generate_id()
    events.append({
        "id": repair_id, "sessionId": sid, "timestamp": get_time(),
        "type": "thought", "parentId": warn_id, "content": "Self-Correction triggered. Safety guardrail active. Switching to safe file search and target delete.",
        "metadata": {"confidence": 1.0, "selfCorrection": True}
    })
    
    tool2_id = generate_id()
    events.append({
        "id": tool2_id, "sessionId": sid, "timestamp": get_time(),
        "type": "tool_call", "parentId": repair_id, "content": "Issuing safe command execution.",
        "metadata": {"toolName": "bash_run", "command": "find /var/log -name '*.log' -mtime +30 -exec rm {} \\;"}
    })
    
    res_id = generate_id()
    events.append({
        "id": res_id, "sessionId": sid, "timestamp": get_time(),
        "type": "tool_result", "parentId": tool2_id, "content": "Targeted clean complete. 42 outdated log files safely removed.",
        "metadata": {"latency": 87}
    })
    
    write_demo("hallucination_repair.json", events)

if __name__ == "__main__":
    build_simple_reasoning()
    build_tool_agent()
    build_hallucination_repair()
