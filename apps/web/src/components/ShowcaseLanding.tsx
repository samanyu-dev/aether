"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Cpu, 
  Brain, 
  AlertTriangle, 
  Terminal, 
  GitBranch, 
  ArrowRight,
  Sparkles,
  Shield,
  HardDrive,
  Lock,
  CloudOff,
  Server,
  Activity
} from "lucide-react";
import { useAetherStore, AetherEvent } from "@/store/useAetherStore";

// Static definitions of the 3 demos so they load INSTANTLY offline
const DEMOS: Record<string, { title: string; description: string; events: AetherEvent[] }> = {
  simple: {
    title: "Simple Reasoning",
    description: "Introductory 12-node quantum computing tutor trace demonstrating node birth & token streaming.",
    events: [
  {
    "id": "low-n1",
    "sessionId": "simple-reasoning-demo",
    "timestamp": "2026-05-17T23:45:00.000Z",
    "type": "thought",
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
  },
  tool: {
    title: "Multi-Tool Agent",
    description: "Model fine-tuning research agent with latency tracing, memory databases, and parallel loops.",
    events: [
  {
    "id": "med-n1",
    "sessionId": "tool-agent-demo",
    "timestamp": "2026-05-17T23:46:00.000Z",
    "type": "thought",
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
  },
  hallucination: {
    title: "Hallucination & Correction",
    description: "Critical DevOps deployment intervention, red alert rupture slowdown, self-correction, and recovery.",
    events: [
  {
    "id": "high-n1",
    "sessionId": "hallucination-demo",
    "timestamp": "2026-05-17T23:47:00.000Z",
    "type": "thought",
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
      "confidence": 1,
      "selfCorrection": true
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
};

const OnboardingConsole = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/60 rounded-lg p-4 font-mono text-[10px] text-cyan-400/90 border border-white/5 shadow-inner leading-relaxed mb-4 relative min-h-[175px]">
      {/* Dynamic step states */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-1"
          >
            <div className="text-white/20 select-none"># 1. Install tracing runner</div>
            <div className="text-cyan-400 font-bold flex items-center gap-1">
              <span className="text-white/40 select-none">$</span> pip install aether-observe
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-1.5 h-3 bg-cyan-400"
              />
            </div>
            <div className="text-emerald-500/80 pt-2 text-[9px] animate-pulse">✓ Installed successfully</div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-1"
          >
            <div className="text-white/20 select-none"># 2. Instrument in 1 line</div>
            <div className="text-white/90 font-semibold"><span className="text-cyan-400">from</span> aether <span className="text-cyan-400">import</span> AgentTracer</div>
            <div className="text-white/90">tracer = AgentTracer(project=<span className="text-amber-300">"assistant"</span>)</div>
            <div className="text-white/90"><span className="text-cyan-400">with</span> tracer.session(<span className="text-amber-300">"chat-agent"</span>):</div>
            <div className="text-white/50">  thought = tracer.thought(<span className="text-amber-300">"Analyzing request..."</span>)</div>
            <div className="text-white/50">  tracer.tool_call(<span className="text-amber-300">"web_search"</span>)</div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-1"
          >
            <div className="text-white/20 select-none"># 3. Launch fully offline viewer</div>
            <div className="text-cyan-400 font-bold flex items-center gap-1">
              <span className="text-white/40 select-none">$</span> aether replay
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-1.5 h-3 bg-cyan-400"
              />
            </div>
            <div className="text-cyan-400/50 pt-2 text-[9px] animate-pulse">Launching Aether local web server on port 3000...</div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-2 text-center py-4"
          >
            <Sparkles className="mx-auto text-amber-400 animate-spin" size={18} />
            <div className="text-[11px] font-bold text-white/90 uppercase tracking-widest">Replay Reconstructed!</div>
            <div className="space-y-1 text-[9px] text-cyan-400/80 font-semibold max-w-xs mx-auto">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-between items-center bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/10">
                <span>⚡ TRACE GENERATED</span> <span className="text-emerald-400">✓</span>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-between items-center bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/10">
                <span>🧬 REPLAY SEQUENCED</span> <span className="text-emerald-400">✓</span>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex justify-between items-center bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/10">
                <span>🌌 COGNITION EMERGES</span> <span className="text-emerald-400">✓</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Interactive Step Indicator Dots */}
      <div className="absolute bottom-2 right-3 flex gap-1 select-none">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1 h-1 rounded-full transition-all duration-300 ${
              step === i ? "bg-cyan-400 w-2.5" : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const ShowcaseLanding = () => {
  const loadReplay = useAetherStore((s) => s.loadReplay);
  const [activeTab, setActiveTab] = useState<"flow" | "engine" | "lifecycle">("flow");
  const [localSessions, setLocalSessions] = useState<Array<{
    filename: string;
    session_id: string;
    agent_name: string;
    event_count: number;
    timestamp: string;
  }>>([]);

  useEffect(() => {
    // Check local server trace list
    fetch("/api/traces")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setLocalSessions(data);
        }
      })
      .catch(() => {
        // Silent catch for Vercel/HF static modes
      });
  }, []);

  const runLocalSession = (filename: string) => {
    fetch(`/api/traces/${filename}`)
      .then((res) => res.json())
      .then((data) => {
        const events = Array.isArray(data) ? data : data.events;
        if (Array.isArray(events)) {
          loadReplay(events as AetherEvent[]);
          setTimeout(() => {
            useAetherStore.getState().computeGraph();
          }, 50);
        }
      })
      .catch(() => {
        alert("Failed to load local session trace file.");
      });
  };

  const runDemoSession = (key: keyof typeof DEMOS) => {
    const demo = DEMOS[key];
    loadReplay(demo.events as AetherEvent[]);
    setTimeout(() => {
      useAetherStore.getState().computeGraph();
    }, 50);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-8 py-12 flex flex-col items-center justify-start bg-[#010103]/90 z-10 custom-scrollbar select-none">
      <style>{`
        @keyframes marquee-vertical {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .animate-marquee-vertical {
          animation: marquee-vertical 2s linear infinite;
        }
      `}</style>
      
      {/* ── HERO BANNER ── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/10 text-cyan-400 text-[9px] font-mono tracking-wider uppercase mb-3 shadow-[0_0_15px_rgba(0,242,255,0.05)]">
          <Sparkles size={9} className="animate-pulse" />
          Aether Trace Observatory
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white/95 leading-tight">
          Replay and debug <span className="text-cyan-400">AI cognition visually.</span>
        </h1>
        <p className="text-[11px] text-white/40 mt-2 max-w-md mx-auto leading-relaxed">
          Private, local-first devtools for replaying AI reasoning, auditing vector memories, and safely isolating cognitive hallucinations in real-time.
        </p>
      </motion.div>

      {/* ── SPLIT ROW CONTAINER ── */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-stretch">
        
        {/* ── LEFT COLUMN: GETTING STARTED & LOCAL-FIRST ── */}
        <div className="flex flex-col gap-6">
          
          {/* Onboarding Python SDK block */}
          <div className="border border-white/[0.04] bg-white/[0.01] rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3">
              <span className="text-[8px] font-mono font-bold tracking-widest text-cyan-500/80 bg-cyan-500/5 px-2 py-0.5 border border-cyan-500/10 rounded">
                PYTHON SDK
              </span>
            </div>
            
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Terminal size={12} className="text-cyan-400" />
              ⚡ Onboarding in 10 Seconds
            </h3>
            
            {/* Ultra-Premium Interactive Code Panel */}
            <OnboardingConsole />

            {/* Checklist items */}
            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-white/40 border-t border-white/[0.03] pt-3">
              <div className="flex items-center gap-1.5 text-cyan-400/80">
                <span className="text-[10px] font-bold">✓</span> Trace Auto-Generated
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400/80">
                <span className="text-[10px] font-bold">✓</span> Replay Opens Locally
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400/80">
                <span className="text-[10px] font-bold">✓</span> Cognition Graph Reconstructs
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400/80">
                <span className="text-[10px] font-bold">✓</span> Timeline Interactive
              </div>
            </div>
          </div>

          {/* Runs Fully Local block */}
          <div className="border border-white/[0.04] bg-white/[0.01] rounded-xl p-5 flex flex-col justify-between shadow-sm">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock size={12} className="text-emerald-400" />
              🏡 Private & Runs Fully Local
            </h3>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { title: "No Cloud Dependency", desc: "Runs 100% on localhost", icon: CloudOff },
                { title: "No Telemetry", desc: "Your data stays inside your files", icon: Shield },
                { title: "Zero Infrastructure Cost", desc: "Replay traces stored as JSON", icon: HardDrive },
                { title: "Privacy-Safe Debugging", desc: "Offline visualizer verification", icon: Server }
              ].map((item) => (
                <div key={item.title} className="flex gap-2 items-start">
                  <div className="p-1 rounded bg-white/[0.02] border border-white/[0.04] shrink-0 text-white/40">
                    <item.icon size={11} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-white/70">{item.title}</h4>
                    <p className="text-[8px] text-white/30 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* ── RIGHT COLUMN: DEMO REPLAYS & RECONSTRUCTION PIPELINE ── */}
        <div className="flex flex-col gap-6 justify-between">
          
          {/* Main Hallucination & Self-Correction CTA (WOW MOMENT) */}
          <div 
            onClick={() => runDemoSession("hallucination")}
            className="group relative rounded-xl border border-rose-500/20 bg-rose-950/5 p-6 hover:bg-rose-950/10 hover:border-rose-500/35 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-[0_0_30px_rgba(244,63,94,0.03)]"
          >
            <div className="absolute top-4 right-4 text-rose-400 group-hover:scale-110 transition-transform">
              <Play size={18} fill="currentColor" className="opacity-80" />
            </div>
            
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8px] font-mono uppercase tracking-widest font-bold mb-3 border border-rose-500/15">
                <AlertTriangle size={8} className="animate-pulse" />
                Primary Hallucination Demo
              </div>
              <h3 className="text-sm font-bold text-white/90 group-hover:text-rose-400 transition-colors">
                Launch Interactive Replay
              </h3>
              <p className="text-[10px] text-white/40 mt-1 leading-relaxed">
                Observe how Aether intercepts a DevOps wildcard shell execution attempt, slowing down pacing with a red rupture sweep before stabilizing via safe sibling path correction.
              </p>
            </div>
            
            <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/20 uppercase">
                31 Events • Sandbox Audited
              </span>
              <span className="text-[10px] font-bold text-rose-400/90 group-hover:text-rose-400 flex items-center gap-1 transition-colors">
                Start Traversal →
              </span>
            </div>
          </div>

          {/* Quick links to alternate demos */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(DEMOS).filter(([k]) => k !== "hallucination").map(([key, demo]) => (
              <div
                key={key}
                onClick={() => runDemoSession(key as keyof typeof DEMOS)}
                className="group p-3 rounded-lg border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.02] hover:border-cyan-500/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-[10px] font-bold text-white/80 group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                    {key === "simple" ? <Brain size={11} className="text-cyan-400" /> : <Cpu size={11} className="text-amber-400" />}
                    {demo.title}
                  </h4>
                  <p className="text-[8px] text-white/30 mt-1 line-clamp-2 leading-snug">
                    {demo.description}
                  </p>
                </div>
                <div className="text-[8px] text-cyan-400/80 group-hover:text-cyan-400 font-semibold text-right mt-2 flex items-center justify-end gap-0.5">
                  Launch <ArrowRight size={8} />
                </div>
              </div>
            ))}
          </div>

          {/* Reasoning Reconstruction Pipeline (Part 2) */}
          <div className="border border-white/[0.04] bg-white/[0.01] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={12} className="text-cyan-400" />
              🧠 Reasoning Reconstruction Pipeline
            </h3>
            
            {/* Horizontal pipeline flow */}
            <div className="grid grid-cols-6 gap-1 relative py-2 px-1">
              {[
                { name: "Agent", desc: "Telemetry capture" },
                { name: "SDK", desc: "1-line intercept" },
                { name: "Stream", desc: "Disk JSON buffering" },
                { name: "Sequencer", desc: "Timeline playback" },
                { name: "Graph", desc: "Dagre DAG layout" },
                { name: "Observer", desc: "60fps playback" }
              ].map((stage, idx, arr) => (
                <div key={stage.name} className="flex flex-col items-center text-center relative group">
                  <div className="w-5 h-5 rounded-full bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-center text-[9px] font-mono font-bold text-cyan-400 relative z-10 shadow-[0_0_8px_rgba(0,242,255,0.05)]">
                    {idx + 1}
                  </div>
                  <h4 className="text-[8px] font-bold text-white/80 mt-1.5 truncate w-full">{stage.name}</h4>
                  
                  {idx < arr.length - 1 && (
                    <div className="absolute top-2.5 left-[60%] right-[-40%] h-0.5 bg-gradient-to-r from-cyan-500/20 to-cyan-500/40 pointer-events-none overflow-hidden z-0">
                      <div className="absolute top-0 bottom-0 w-2.5 bg-cyan-400/80 rounded-full animate-marquee-vertical" style={{ animationName: 'marquee-horizontal', animationDuration: '1.5s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <style>{`
              @keyframes marquee-horizontal {
                0% { left: -10%; }
                100% { left: 110%; }
              }
            `}</style>
          </div>

        </div>

      </div>

      {/* ── DETECTED LOCAL SESSIONS PANEL ── */}
      {localSessions.length > 0 && (
        <div className="w-full max-w-4xl border border-cyan-500/20 bg-cyan-950/5 rounded-2xl p-6 mb-8 shadow-[0_0_30px_rgba(0,242,255,0.03)] animate-fade-in-up">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Terminal size={14} className="animate-pulse" />
            Detected Local Traces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localSessions.map((session) => (
              <div
                key={session.filename}
                onClick={() => runLocalSession(session.filename)}
                className="group flex flex-col justify-between p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-cyan-500/20 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-mono text-cyan-400/80 font-bold block mb-1 uppercase tracking-wider">
                      {session.agent_name || "Agent Runtime"}
                    </span>
                    <h4 className="text-xs font-bold text-white/80 group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {session.session_id}
                    </h4>
                  </div>
                  <span className="text-[8px] font-mono text-white/20 bg-white/[0.03] px-2 py-0.5 rounded whitespace-nowrap">
                    {session.event_count} Events
                  </span>
                </div>
                <div className="mt-4 pt-2 border-t border-white/[0.02] flex items-center justify-between">
                  <span className="text-[8px] font-mono text-white/20">
                    {new Date(session.timestamp).toLocaleString()}
                  </span>
                  <span className="text-[9px] font-semibold text-cyan-400/80 group-hover:text-cyan-400 flex items-center gap-1 transition-colors">
                    Open Trace <ArrowRight size={8} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
