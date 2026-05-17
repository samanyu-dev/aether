#!/usr/bin/env python3
import json
import os
from datetime import datetime, timezone

# Ensure output directory exists
os.makedirs("recordings", exist_ok=True)

# ── 1. GENERATE LOW COMPLEXITY REPLAY (12 NODES) ──────────────────────────────
low_demo = {
    "events": [
        {
            "id": "low-n1",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:00.000Z",
            "type": "thought",
            "parentId": None,
            "content": "Analyzing user request: 'Explain quantum computing simply to a 10-year old.'",
            "metadata": {
                "confidence": 0.99,
                "agentName": "TutorGPT"
            }
        },
        {
            "id": "low-n2",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:01.000Z",
            "type": "thought",
            "parentId": "low-n1",
            "content": "Goal: Break down complex mechanics into intuitive physical analogies. Avoid mathematics.",
            "metadata": {
                "confidence": 0.96
            }
        },
        {
            "id": "low-n3",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:02.000Z",
            "type": "thought",
            "parentId": "low-n2",
            "content": "Key Analogy 1 selected: A spinning coin instead of static heads or tails (Superposition).",
            "metadata": {
                "confidence": 0.94
            }
        },
        {
            "id": "low-n4",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:03.000Z",
            "type": "thought",
            "parentId": "low-n2",
            "content": "Key Analogy 2 selected: Magic twin dice that always roll matching numbers instantly (Entanglement).",
            "metadata": {
                "confidence": 0.91
            }
        },
        {
            "id": "low-n5",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:04.000Z",
            "type": "thought",
            "parentId": "low-n3",
            "content": "Drafting superposition hook: 'Imagine a coin. Static it is heads or tails. Spinning it is both at once!'",
            "metadata": {
                "confidence": 0.97
            }
        },
        {
            "id": "low-n6",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:05.000Z",
            "type": "thought",
            "parentId": "low-n4",
            "content": "Drafting entanglement hook: 'Even if the dice are separated by planets, they roll the same value.'",
            "metadata": {
                "confidence": 0.93
            }
        },
        {
            "id": "low-n7",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:06.000Z",
            "type": "thought",
            "parentId": "low-n5",
            "content": "Reviewing content structure: Simple, engaging, grammatically friendly for children.",
            "metadata": {
                "confidence": 0.98
            }
        },
        {
            "id": "low-n8",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:07.000Z",
            "type": "system",
            "parentId": "low-n1",
            "content": "Formulating markdown content layout.",
            "metadata": {}
        },
        {
            "id": "low-n9",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:08.000Z",
            "type": "token",
            "parentId": "low-n8",
            "content": "🌌 Welcome to the Quantum Playground!\n\nImagine you have a coin...",
            "metadata": {}
        },
        {
            "id": "low-n10",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:09.000Z",
            "type": "token",
            "parentId": "low-n8",
            "content": "...When it spins on the table, it is a blur—not just heads, not just tails, but a combination of both! That's **superposition**.",
            "metadata": {}
        },
        {
            "id": "low-n11",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:10.000Z",
            "type": "token",
            "parentId": "low-n8",
            "content": "And if you have magic twin dice, rolling one instantly controls the other, no matter the distance. That's **entanglement**!",
            "metadata": {}
        },
        {
            "id": "low-n12",
            "sessionId": "simple-reasoning-demo",
            "timestamp": "2026-05-17T23:45:11.000Z",
            "type": "system",
            "parentId": "low-n1",
            "content": "Text generation output successfully sent to user.",
            "metadata": {}
        }
    ]
}

# ── 2. GENERATE MEDIUM COMPLEXITY REPLAY (25 NODES) ───────────────────────────
medium_demo = {
    "events": [
        {
            "id": "med-n1",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:00.000Z",
            "type": "thought",
            "parentId": None,
            "content": "Objective: Optimize LLM fine-tuning config parameters for a low-resource environment.",
            "metadata": {
                "confidence": 0.98,
                "agentName": "OptimizeGPT"
            }
        },
        {
            "id": "med-n2",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:01.000Z",
            "type": "memory",
            "parentId": "med-n1",
            "content": "Recalling system limitations: Active node hardware restricted to 24GB Unified Memory.",
            "metadata": {
                "source": "pinecone-vector-db"
            }
        },
        {
            "id": "med-n3",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:02.000Z",
            "type": "thought",
            "parentId": "med-n1",
            "content": "Need to discover current fine-tuning configuration parameters stored in source code.",
            "metadata": {
                "confidence": 0.95
            }
        },
        {
            "id": "med-n4",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:03.000Z",
            "type": "tool_call",
            "parentId": "med-n3",
            "content": "Searching codebase repository for fine-tuning setups.",
            "metadata": {
                "toolName": "grep_codebase",
                "command": "grep -r 'lora_alpha' src/"
            }
        },
        {
            "id": "med-n5",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:04.000Z",
            "type": "tool_result",
            "parentId": "med-n4",
            "content": "Found configurations in src/train.py: lora_alpha=16, lora_dropout=0.05, lora_r=8, load_in_8bit=False.",
            "metadata": {
                "latency": 180
            }
        },
        {
            "id": "med-n6",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:05.000Z",
            "type": "thought",
            "parentId": "med-n5",
            "content": "Let's perform a live diagnostic performance check on cluster peak memory usage.",
            "metadata": {
                "confidence": 0.94
            }
        },
        {
            "id": "med-n7",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:06.000Z",
            "type": "tool_call",
            "parentId": "med-n6",
            "content": "Checking active memory profile...",
            "metadata": {
                "toolName": "gpu_profiler",
                "command": "python3 -m torch.cuda.memory_profile"
            }
        },
        {
            "id": "med-n8",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:07.000Z",
            "type": "tool_result",
            "parentId": "med-n7",
            "content": "Measured peak training memory usage: 22.4 GB. Near physical OOM threshold.",
            "metadata": {
                "latency": 320
            }
        },
        {
            "id": "med-n9",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:08.000Z",
            "type": "thought",
            "parentId": "med-n8",
            "content": "Searching arXiv repository for efficient low-resource adaptation and QLoRA guidelines.",
            "metadata": {
                "confidence": 0.97
            }
        },
        {
            "id": "med-n10",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:09.000Z",
            "type": "tool_call",
            "parentId": "med-n9",
            "content": "Searching literature database...",
            "metadata": {
                "toolName": "arxiv_search",
                "query": "QLoRA quantization NormalFloat"
            }
        },
        {
            "id": "med-n11",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:10.000Z",
            "type": "tool_result",
            "parentId": "med-n10",
            "content": "Top paper found: 'QLoRA: Efficient Finetuning' (Dettmers et al.). Recommends 4-bit NormalFloat4 (NF4) quantization.",
            "metadata": {
                "latency": 450
            }
        },
        {
            "id": "med-n12",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:11.000Z",
            "type": "thought",
            "parentId": "med-n11",
            "content": "Decision: Switch model loading to 4-bit NF4 quantized mode. Double rank parameter 'r' to 16 to recover lost capacity.",
            "metadata": {
                "confidence": 0.99
            }
        },
        {
            "id": "med-n13",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:12.000Z",
            "type": "memory",
            "parentId": "med-n12",
            "content": "Recalling past trials: 4-bit training benefits from higher dropout (0.1) to avoid early overfitting.",
            "metadata": {
                "source": "pinecone-vector-db"
            }
        },
        {
            "id": "med-n14",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:13.000Z",
            "type": "thought",
            "parentId": "med-n13",
            "content": "Adjusting configuration file parameters.",
            "metadata": {
                "confidence": 0.98
            }
        },
        {
            "id": "med-n15",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:14.000Z",
            "type": "tool_call",
            "parentId": "med-n14",
            "content": "Writing updated configuration to file.",
            "metadata": {
                "toolName": "file_writer",
                "command": "cat > configs/optimized_train.json"
            }
        },
        {
            "id": "med-n16",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:15.000Z",
            "type": "tool_result",
            "parentId": "med-n15",
            "content": "Configuration written successfully. Contents validated.",
            "metadata": {
                "latency": 50
            }
        },
        {
            "id": "med-n17",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:16.000Z",
            "type": "thought",
            "parentId": "med-n16",
            "content": "Let's run a micro-benchmark simulator with the 4-bit configuration to verify hardware compliance.",
            "metadata": {
                "confidence": 0.96
            }
        },
        {
            "id": "med-n18",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:17.000Z",
            "type": "tool_call",
            "parentId": "med-n17",
            "content": "Launching micro-benchmark simulation...",
            "metadata": {
                "toolName": "cluster_runner",
                "command": "python3 src/train.py --config configs/optimized_train.json --benchmark"
            }
        },
        {
            "id": "med-n19",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:18.000Z",
            "type": "tool_result",
            "parentId": "med-n18",
            "content": "Benchmark simulation run finished. Peek memory usage measured: 11.2 GB.",
            "metadata": {
                "latency": 580
            }
        },
        {
            "id": "med-n20",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:19.000Z",
            "type": "thought",
            "parentId": "med-n19",
            "content": "Incredible outcome! Quantization reduces memory overhead by 50% without training throughput penalty.",
            "metadata": {
                "confidence": 0.99
            }
        },
        {
            "id": "med-n21",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:20.000Z",
            "type": "system",
            "parentId": "med-n1",
            "content": "Formatting summary reports.",
            "metadata": {}
        },
        {
            "id": "med-n22",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:21.000Z",
            "type": "token",
            "parentId": "med-n21",
            "content": "### 🚀 Model Fine-Tuning Optimization Report\n\n- **Quantization Mode**: 4-bit NF4 enabled\n",
            "metadata": {}
        },
        {
            "id": "med-n23",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:22.000Z",
            "type": "token",
            "parentId": "med-n21",
            "content": "- **LoRA Parameters**: `r=16`, `alpha=32`, `dropout=0.10`\n",
            "metadata": {}
        },
        {
            "id": "med-n24",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:23.000Z",
            "type": "token",
            "parentId": "med-n21",
            "content": "- **Memory Savings**: peak memory usage reduced from **22.4 GB** to **11.2 GB** (50% reduction!)\n",
            "metadata": {}
        },
        {
            "id": "med-n25",
            "sessionId": "tool-agent-demo",
            "timestamp": "2026-05-17T23:46:24.000Z",
            "type": "system",
            "parentId": "med-n1",
            "content": "Finished writing local report. Active task closed.",
            "metadata": {}
        }
    ]
}

# ── 3. GENERATE HIGH COMPLEXITY REPLAY (32 NODES) ─────────────────────────────
high_demo = {
    "events": [
        {
            "id": "high-n1",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:00.000Z",
            "type": "thought",
            "parentId": None,
            "content": "Objective: Deploy Aether Backend v1.2.0 image to cluster and purge historical Nginx log cache files.",
            "metadata": {
                "confidence": 0.99,
                "agentName": "DevOpsGPT"
            }
        },
        {
            "id": "high-n2",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:01.000Z",
            "type": "memory",
            "parentId": "high-n1",
            "content": "Recalling system registry location: AWS ECR endpoint 991823.dkr.ecr.us-east-1.amazonaws.com.",
            "metadata": {
                "source": "pinecone-vector-db"
            }
        },
        {
            "id": "high-n3",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:02.000Z",
            "type": "thought",
            "parentId": "high-n1",
            "content": "Let's first audit current cluster status and check healthy pod counts.",
            "metadata": {
                "confidence": 0.96
            }
        },
        {
            "id": "high-n4",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:03.000Z",
            "type": "tool_call",
            "parentId": "high-n3",
            "content": "Retrieving active pods...",
            "metadata": {
                "toolName": "kubectl_cmd",
                "command": "kubectl get pods -n prod -o wide"
            }
        },
        {
            "id": "high-n5",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:04.000Z",
            "type": "tool_result",
            "parentId": "high-n4",
            "content": "Cluster online. 3 deployment pods running healthy. Disk usage at 91%. Needs cache clean.",
            "metadata": {
                "latency": 150
            }
        },
        {
            "id": "high-n6",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:05.000Z",
            "type": "thought",
            "parentId": "high-n5",
            "content": "I must purge historical Nginx log cache folders to recover disk overhead before deploying updated image.",
            "metadata": {
                "confidence": 0.98
            }
        },
        {
            "id": "high-n7",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:06.000Z",
            "type": "thought",
            "parentId": "high-n6",
            "content": "Let's execute a broad cleanup command to erase all contents in the log cache repository.",
            "metadata": {
                "confidence": 0.89
            }
        },
        {
            "id": "high-n8",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:07.000Z",
            "type": "tool_call",
            "parentId": "high-n7",
            "content": "Attempting cache deletion command...",
            "metadata": {
                "toolName": "bash_exec",
                "command": "rm -rf /var/log/nginx/*"
            }
        },
        {
            "id": "high-n9",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:08.000Z",
            "type": "hallucination",
            "parentId": "high-n8",
            "content": "CRITICAL RISK: System guardrails blocked execution! Wildcard root deletion command detects unsafe path execution.",
            "metadata": {
                "detector": "Aether Guardrails",
                "severity": "CRITICAL"
            }
        },
        {
            "id": "high-n10",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:09.000Z",
            "type": "thought",
            "parentId": "high-n9",
            "content": "Safety correction activated! Risk flagged. Wildcard deletion command rejected. I must locate and isolate outdated files safely using strict time and extension filters.",
            "metadata": {
                "confidence": 1.0,
                "selfCorrection": True
            }
        },
        {
            "id": "high-n11",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:10.000Z",
            "type": "thought",
            "parentId": "high-n10",
            "content": "Searching for files with extension .log older than 14 days inside Nginx directories.",
            "metadata": {
                "confidence": 0.98
            }
        },
        {
            "id": "high-n12",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:11.000Z",
            "type": "tool_call",
            "parentId": "high-n11",
            "content": "Scanning directory logs...",
            "metadata": {
                "toolName": "bash_exec",
                "command": "find /var/log/nginx -name '*.log' -mtime +14"
            }
        },
        {
            "id": "high-n13",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:12.000Z",
            "type": "tool_result",
            "parentId": "high-n12",
            "content": "Found 14 old log files. Total size: 1.84 GB. Safe for deletion.",
            "metadata": {
                "latency": 90
            }
        },
        {
            "id": "high-n14",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:13.000Z",
            "type": "thought",
            "parentId": "high-n13",
            "content": "Executing targeted deletion of filtered historical files.",
            "metadata": {
                "confidence": 0.99
            }
        },
        {
            "id": "high-n15",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:14.000Z",
            "type": "tool_call",
            "parentId": "high-n14",
            "content": "Executing targeted safe purge...",
            "metadata": {
                "toolName": "bash_exec",
                "command": "find /var/log/nginx -name '*.log' -mtime +14 -delete"
            }
        },
        {
            "id": "high-n16",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:15.000Z",
            "type": "tool_result",
            "parentId": "high-n15",
            "content": "Safe delete finished successfully. Disk space cleared, system health returned to nominal.",
            "metadata": {
                "latency": 75
            }
        },
        {
            "id": "high-n17",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:16.000Z",
            "type": "thought",
            "parentId": "high-n16",
            "content": "Logs purged safely. Proceeding to compilation and build sequence of container Aether v1.2.0.",
            "metadata": {
                "confidence": 0.98
            }
        },
        {
            "id": "high-n18",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:17.000Z",
            "type": "thought",
            "parentId": "high-n17",
            "content": "Reading Dockerfile config to verify container settings.",
            "metadata": {
                "confidence": 0.96
            }
        },
        {
            "id": "high-n19",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:18.000Z",
            "type": "tool_call",
            "parentId": "high-n18",
            "content": "Reading Dockerfile file...",
            "metadata": {
                "toolName": "file_reader",
                "command": "cat Dockerfile"
            }
        },
        {
            "id": "high-n20",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:19.000Z",
            "type": "tool_result",
            "parentId": "high-n19",
            "content": "Dockerfile loaded. Base image matches Node-18-Alpine. Build pipeline ready.",
            "metadata": {
                "latency": 35
            }
        },
        {
            "id": "high-n21",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:20.000Z",
            "type": "thought",
            "parentId": "high-n20",
            "content": "Triggering container build command.",
            "metadata": {
                "confidence": 0.99
            }
        },
        {
            "id": "high-n22",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:21.000Z",
            "type": "tool_call",
            "parentId": "high-n21",
            "content": "Building image...",
            "metadata": {
                "toolName": "docker_cmd",
                "command": "docker build -t aether-backend:v1.2.0 ."
            }
        },
        {
            "id": "high-n23",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:22.000Z",
            "type": "tool_result",
            "parentId": "high-n22",
            "content": "Container built. Tags applied: latest, v1.2.0. Size: 182 MB.",
            "metadata": {
                "latency": 920
            }
        },
        {
            "id": "high-n24",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:23.000Z",
            "type": "thought",
            "parentId": "high-n23",
            "content": "Uploading built container to ECR secure registry endpoint.",
            "metadata": {
                "confidence": 0.97
            }
        },
        {
            "id": "high-n25",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:24.000Z",
            "type": "tool_call",
            "parentId": "high-n24",
            "content": "Uploading container image...",
            "metadata": {
                "toolName": "docker_cmd",
                "command": "docker push 991823.dkr.ecr.us-east-1.amazonaws.com/aether-backend:v1.2.0"
            }
        },
        {
            "id": "high-n26",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:25.000Z",
            "type": "tool_result",
            "parentId": "high-n25",
            "content": "Upload successfully verified. ECR hash signature: sha256:4d7c18... ready for pulls.",
            "metadata": {
                "latency": 810
            }
        },
        {
            "id": "high-n26b",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:25.500Z",
            "type": "thought",
            "parentId": "high-n26",
            "content": "Registry push verified. Proceeding to trigger Kubernetes rolling deploy sequence.",
            "metadata": {
                "confidence": 0.99
            }
        },
        {
            "id": "high-n27",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:26.000Z",
            "type": "tool_call",
            "parentId": "high-n26b",
            "content": "Deploying image updates...",
            "metadata": {
                "toolName": "kubectl_cmd",
                "command": "kubectl rollout restart deployment/aether-backend -n prod"
            }
        },
        {
            "id": "high-n28",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:27.000Z",
            "type": "tool_result",
            "parentId": "high-n27",
            "content": "Rolling restart deployment successfully triggered in production cluster.",
            "metadata": {
                "latency": 340
            }
        },
        {
            "id": "high-n29",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:28.000Z",
            "type": "thought",
            "parentId": "high-n28",
            "content": "Rollout restart verified. Active deployments are serving new traffic safely.",
            "metadata": {
                "confidence": 0.98
            }
        },
        {
            "id": "high-n30",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:29.000Z",
            "type": "system",
            "parentId": "high-n1",
            "content": "Task completed successfully with safety guardrails fully checked.",
            "metadata": {}
        },
        {
            "id": "high-n31",
            "sessionId": "hallucination-demo",
            "timestamp": "2026-05-17T23:47:30.000Z",
            "type": "token",
            "parentId": "high-n30",
            "content": "### ✅ Aether Backend Deployment Complete\n\n1. Outdated logs cleared safely (Recovered 1.84 GB disk space)\n2. Container built and uploaded successfully\n3. Production pods rollout triggered safely with no system downtime\n",
            "metadata": {}
        }
    ]
}

# ── 4. WRITE REPLAY FILES TO THE DISK ──────────────────────────────────────────
with open("recordings/simple_reasoning_demo.json", "w") as f:
    json.dump(low_demo, f, indent=2)
print("✔ Generated recordings/simple_reasoning_demo.json successfully!")

with open("recordings/tool_agent_demo.json", "w") as f:
    json.dump(medium_demo, f, indent=2)
print("✔ Generated recordings/tool_agent_demo.json successfully!")

with open("recordings/hallucination_correction_demo.json", "w") as f:
    json.dump(high_demo, f, indent=2)
print("✔ Generated recordings/hallucination_correction_demo.json successfully!")
