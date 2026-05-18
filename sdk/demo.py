"""
Aether Demo — Autonomous Multi-Agent Cognition Replay
=====================================================

A cinematic but lightweight demo showcasing:
- multi-agent coordination
- branching reasoning
- tool usage
- memory retrieval
- hallucination detection
- self-correction
- replay wave traversal
- token streaming
- architectural decision making

Optimized for:
- clean DAG visualization
- replay storytelling
- stable memory usage
- React Flow readability
- Aether showcase recordings

Run:
    python3 demo.py
"""

import time
from aether import AgentTracer


def pause(t=0.5):
    time.sleep(t)


def stream_paragraph(session, text, parent_id=None, delay=0.035):
    tokens = text.split(" ")
    formatted = [t if i == 0 else f" {t}" for i, t in enumerate(tokens)]
    session.stream_tokens(formatted, parent_id=parent_id, delay=delay)


def run_demo():
    print("\n🧠 Aether Cognition Observatory — Showcase Demo")
    print("=" * 60)

    tracer = AgentTracer(project="aether-showcase")

    with tracer.session(
        "autonomous-architect",
        agent_name="ArchitectGPT",
        session_id="demo-session",
    ) as s:

        # =========================================================
        # ROOT OBJECTIVE
        # =========================================================

        root = s.thought(
            "User request received: Design a scalable multi-region AI memory service with low latency failover.",
            confidence=0.99,
        )
        pause(0.8)

        planner = s.thought(
            "Breaking objective into architecture, infrastructure, caching, and deployment tasks.",
            parent_id=root,
            confidence=0.96,
        )
        pause(0.7)

        # =========================================================
        # PARALLEL TOOL EXECUTION
        # =========================================================

        infra_search = s.tool_call(
            "vector_search",
            {
                "query": "multi-region Redis + pgvector architecture",
                "top_k": 3,
            },
            parent_id=planner,
        )

        codebase_scan = s.tool_call(
            "grep_codebase",
            {
                "pattern": "redis|postgres|asyncpg",
                "path": "/services",
            },
            parent_id=planner,
        )

        cloud_pricing = s.tool_call(
            "cloud_cost_estimator",
            {
                "provider": "aws",
                "regions": ["us-east-1", "eu-west-1"],
            },
            parent_id=planner,
        )

        pause(1.0)

        s.tool_result(
            infra_search,
            {
                "results": [
                    "Redis Cluster recommended for hot cache",
                    "pgvector suitable for semantic memory",
                    "Use async connection pooling",
                ]
            },
            latency_ms=322,
        )

        s.tool_result(
            codebase_scan,
            {
                "matches": [
                    "/services/cache.py",
                    "/services/memory.py",
                    "/services/legacy_sync.py",
                ]
            },
            latency_ms=198,
        )

        s.tool_result(
            cloud_pricing,
            {
                "monthly_estimate": "$412",
                "high_availability": True,
            },
            latency_ms=604,
        )

        pause(0.9)

        # =========================================================
        # MEMORY RETRIEVAL
        # =========================================================

        memory = s.memory(
            "Retrieving previous deployment guidelines",
            parent_id=root,
            source="pinecone",
        )

        pause(0.6)

        s.thought(
            "Recovered engineering rule: all new infrastructure must support async failover.",
            parent_id=memory,
            confidence=1.0,
        )

        pause(0.5)

        # =========================================================
        # REASONING SYNTHESIS
        # =========================================================

        synthesis = s.thought(
            "Synthesizing architecture: Redis Cluster for hot memory, pgvector for semantic recall, FastAPI async services for orchestration.",
            parent_id=planner,
            confidence=0.93,
        )

        pause(0.8)

        # =========================================================
        # HALLUCINATION WARNING
        # =========================================================

        hallucination = s.hallucination(
            "Warning: Proposed Redis eviction strategy may silently drop semantic embeddings during memory pressure.",
            parent_id=infra_search,
            severity="high",
        )

        pause(0.7)

        # =========================================================
        # SELF CORRECTION
        # =========================================================

        correction = s.thought(
            "Revising memory architecture: embeddings moved to persistent pgvector storage while Redis retains only hot inference context.",
            parent_id=synthesis,
            confidence=0.97,
            metadata={"selfCorrection": True},
        )

        pause(0.9)

        # =========================================================
        # FILE GENERATION
        # =========================================================

        generate_service = s.tool_call(
            "write_file",
            {
                "filepath": "/services/async_memory_service.py",
                "lines": 128,
            },
            parent_id=correction,
        )

        pause(0.5)

        s.tool_result(
            generate_service,
            {
                "status": "success",
                "bytes_written": 7420,
            },
            latency_ms=11,
        )

        pause(0.7)

        # =========================================================
        # MULTI-AGENT VALIDATION
        # =========================================================

        reviewer = s.thought(
            "Reviewer agent validating deployment reliability and rollback strategy.",
            parent_id=root,
            confidence=0.91,
            metadata={"agent": "ReviewerGPT"},
        )

        pause(0.7)

        validation_tool = s.tool_call(
            "deployment_validator",
            {
                "strategy": "rolling-update",
                "rollback": True,
            },
            parent_id=reviewer,
        )

        pause(0.6)

        s.tool_result(
            validation_tool,
            {
                "status": "approved",
                "rollback_window": "5 minutes",
            },
            latency_ms=144,
        )

        pause(0.8)

        # =========================================================
        # FINAL SUMMARY
        # =========================================================

        final = s.thought(
            "Architecture finalized. Streaming deployment summary.",
            parent_id=root,
            confidence=0.99,
        )

        pause(0.5)

        summary = """
Successfully designed and validated the distributed AI memory system.

Key architectural decisions:
- Redis Cluster used for hot inference context
- pgvector used for long-term semantic memory
- Full async FastAPI orchestration layer
- Multi-region failover enabled
- Rolling deployment validation approved
- Legacy sync services isolated safely

The system is now production-ready for deployment.
"""

        stream_paragraph(
            s,
            summary,
            parent_id=final,
            delay=0.03,
        )

        pause(0.5)

        # =========================================================
        # TERMINATION EVENT
        # =========================================================

        s.system(
            "Workflow terminated normally. 0 critical errors detected.",
            parent_id=root,
        )

    print("\n✅ Demo complete!")
    print("🌌 Open the Aether Observatory at:")
    print("👉 http://localhost:3000\n")


if __name__ == "__main__":
    run_demo()