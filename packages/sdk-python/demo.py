"""
Aether Demo — Advanced RAG & Multi-Tool Agent
==============================================
Demonstrates a complex, wide branching reasoning graph
to showcase the new Minimap and Wave Animation systems.
"""
import time
from aether import AgentTracer

def run_demo():
    print("🧠 Aether Cognition Observatory — Advanced Demo")
    print("=" * 50)

    tracer = AgentTracer(project="demo")

    with tracer.session("code-architect", agent_name="ArchitectGPT", session_id="demo-session") as s:
        # 1. Root Intent
        root = s.thought("Analyzing objective: 'Build a scalable Redis caching layer'", confidence=0.98)
        time.sleep(0.8)
        
        # 2. Branching strategies
        planning = s.thought("Formulating multi-step architecture plan.", parent_id=root, confidence=0.92)
        time.sleep(0.6)
        
        # Branch A: Documentation Search
        doc_search = s.tool_call("vector_search", {"query": "Redis cluster optimal config", "k": 3}, parent_id=planning)
        time.sleep(0.4)
        
        # Branch B: Current Codebase Search
        code_search = s.tool_call("grep_codebase", {"pattern": "import redis"}, parent_id=planning)
        time.sleep(1.2)
        
        # Branch A Results
        s.tool_result(doc_search, {"results": ["Use redis-py cluster mode", "Enable connection pooling", "Set maxmemory-policy allkeys-lru"]}, latency_ms=412)
        time.sleep(0.5)
        
        # Branch B Results
        s.tool_result(code_search, {"matches": "Found 4 legacy redis connections in /utils/cache.py"}, latency_ms=189)
        time.sleep(0.8)
        
        # Memory Retrieval
        mem = s.memory("Retrieving project architecture guidelines", parent_id=root, source="pinecone")
        time.sleep(0.6)
        s.thought("Guideline: All new services must use async I/O.", parent_id=mem, confidence=1.0)
        time.sleep(0.5)
        
        # Synthesis & Refinement
        synthesis = s.thought(
            "Synthesizing requirements: Need async redis cluster pool, migrating from legacy sync cache.py.",
            parent_id=planning,
            confidence=0.89,
        )
        time.sleep(0.9)
        
        # Hallucination warning on an edge case
        s.hallucination(
            "Warning: Legacy cache.py uses pickle serialization. AI is suggesting JSON which might break existing cached bytes.",
            parent_id=code_search,
            severity="high",
        )
        time.sleep(0.6)
        
        # Action execution
        write_file = s.tool_call("write_file", {"filepath": "/utils/async_cache.py", "lines": 45}, parent_id=synthesis)
        time.sleep(0.4)
        s.tool_result(write_file, {"status": "success", "bytes_written": 2048}, latency_ms=8)
        time.sleep(0.6)
        
        # Self Correction
        correction = s.thought(
            "Revising implementation: Added pickle fallback compatibility layer to prevent cache miss errors on deployment.",
            parent_id=synthesis,
            confidence=0.95,
            metadata={"selfCorrection": True},
        )
        time.sleep(0.8)
        
        # Finalization
        final = s.thought("Architecture complete. Streaming final summary.", parent_id=root, confidence=0.99)
        time.sleep(0.4)
        
        tokens = [
            "I", " have", " implemented", " the", " scalable", " Redis", " caching", " layer.\n\n",
            "**Key", " Decisions:**\n",
            "-", " Migrated", " to", " `redis.asyncio.cluster`\n",
            "-", " Maintained", " legacy", " `pickle`", " compatibility", " to", " prevent", " downtime\n",
            "-", " Setup", " connection", " pool", " with", " 100", " max", " connections\n\n",
            "The", " code", " is", " ready", " for", " review", " in", " `/utils/async_cache.py`."
        ]
        s.stream_tokens(tokens, parent_id=final, delay=0.04)
        
        time.sleep(0.3)
        s.system("Workflow terminated normally. 0 errors.", parent_id=root)

    print("\n✅ Demo complete! Check the Aether Observatory at http://localhost:3000")

if __name__ == "__main__":
    run_demo()
