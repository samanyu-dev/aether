# Aether 🌌 — Local-First Cognition Debugger for AI Agents

### **Chrome DevTools for AI cognition. Watch AI agents think in real-time, inspect reasoning trees, replay traces offline, auto-trace OpenAI, LangChain, LangGraph, CrewAI, AutoGen, & LlamaIndex, and debug hallucinations inside VS Code with secure enterprise cloud synchronization.**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](https://opensource.org/licenses/MIT)
[![PyPI Version](https://img.shields.io/pypi/v/aether-observe.svg?color=purple)](https://pypi.org/project/aether-observe/)
[![VS Code Extension](https://img.shields.io/badge/VS_Code_Extension-v0.1.0-emerald.svg)](apps/vscode)
[![Pricing Tiers](https://img.shields.io/badge/Pricing-Free_/_Pro_/_Enterprise-gold.svg)](#-pricing--plan-comparisons)

---

## 📽️ Visual Replay Showcase (Hallucination Detection & Self-Correction)

Observe how Aether isolates cognitive branching, intercepting security violations. The active node glows with a strong pulsing rose flare, pausing playback to guide visual debugging:

![Hallucination Correction Visual](./docs/assets/hero_hallucination.png)

### ⚡ Quick 3-Step Install

```bash
# 1. Install our SDK & CLI runner
pip install aether-observe

# 2. Launch the offline Observatory Replay Visualizer
aether replay

# 3. Instrument your agent in 1 line
from aether import AgentTracer
```

---

## 📖 Table of Contents
1. [What is Aether?](#-what-is-aether)
2. [Why Observability Matters](#-why-observability-matters)
3. [Architecture Overview](#-architecture-overview)
4. [The Replay Engine & Graph Architecture](#-the-replay-engine--graph-architecture)
5. [VS Code Extension Platform](#-vs-code-extension-platform)
6. [SDK Quickstart](#-sdk-quickstart)
7. [Pricing & Plan Comparisons](#-pricing--plan-comparisons)
8. [Onboarding Workflow](#-onboarding-workflow)
9. [OAuth Authentication Setup](#-oauth-authentication-setup)
10. [Trace JSON File Schema](#-trace-json-file-schema)
11. [Integrations & CLI Tooling](#-integrations--cli-tooling)
12. [Security Guarantees](#-security-guarantees)
13. [Enterprise Architecture](#-enterprise-architecture)
14. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🌌 What is Aether?
Aether is a next-generation **Local-First Cognition Debugger for AI Agents** built to give developers complete, human-readable insights into agentic decision-making. 

Just like traditional debuggers let you step through assembly or source code execution line-by-line, Aether enables you to **scrub through agent thoughts, memory lookups, tool calls, and API responses** on an interactive, time-synchronized graphical canvas.

Aether consists of:
*   **The Python SDK (`aether-observe`)**: A low-overhead telemetry package that hooks into frameworks (LangChain, OpenAI) to capture agentic cycles.
*   **The Next.js SaaS Web App (`Aether_Web`)**: A cloud dashboard providing central organization, shared team workspaces, pricing management, and persistent trace databases.
*   **The VS Code Extension (`aether-vscode`)**: An IDE sidebar visualizer that connects seamlessly to the SaaS auth server, gates quotas dynamically, and renders beautiful carbon-dark replay timelines right next to active source code.

---

## 💡 Why Observability Matters
Debugging LLM chains and autonomous agents using plain console output (`stdout`) is incredibly painful:
1.  **Non-Linear Thoughts**: Autonomous agents branch out, retrieve context, hallucinate, recover, and spin up sub-agents. Flat textual logs cannot convey these multidimensional relationships.
2.  **Telemetry Desync**: Long-running loops lose historical tracing context, making it extremely hard to analyze where an agent deviated or hallucinated in a sequence of 50+ tool calls.
3.  **Security Risks**: Unmonitored agents may execute dangerous commands (like wildcard deletions). Observing and intercepting these branching decisions via visual guardrails is critical before shipping to production.

Aether solves this by converting textual traces into an explicit **Directed Acyclic Graph (DAG)** of agent cognition, ensuring absolute transparency.

---

## 🏗️ Architecture Overview

Aether operates on a hybrid **local-first with cloud-sync scaling** model.

```
       +--------------------------------------------+
       |           Target Agent Workflow            |
       +---------------------+----------------------+
                             | Writes Local Traces
                             v
               +-------------+-------------+
               |    .aether/traces/*.json  |
               +-------------+-------------+
                             |
         +-------------------+-------------------+
         |                                       |
         v                                       v
+--------+--------+                     +--------+--------+
| VS Code Sidebar |                     |  Aether SaaS    |
| IDE Extension   | <=================> |  Cloud Platform |
| (Local/Cached)  |    OAuth & Sync     |  (Supabase RLS) |
+-----------------+                     +-----------------+
```

1.  **Local-First Isolation**: By default, Aether stores telemetry files locally under `.aether/traces/` as standard, compact JSON. If the user is offline, the system remains 100% functional.
2.  **Dynamic SaaS Coupling**: When signed in, the VS Code extension queries the Aether SaaS API to fetch active subscription levels, synchronize trace databases safely to the cloud via Supabase RLS, and toggle advanced rendering elements.

---

## 🎨 The Replay Engine & Graph Architecture

Aether features a highly optimized React Flow DAG visualizer with custom shaders designed to illustrate how LLMs formulate trajectories:
*   **Node Categories**:
    *   `thought` (Cyan): The agent's raw internal rationale or planning step.
    *   `tool_call` (Gold): Execution hook of an external function (e.g. filesystem edits, web searches).
    *   `tool_result` (Emerald): The parsed response returned by the environment.
    *   `memory` (Purple): High-confidence semantic vector lookups retrieved from vector stores (Pinecone/pgvector).
    *   `hallucination` (Rose Red): Critical safety warnings triggered when execution deviates or violates guardrails.
*   **Visualizer Capabilities**:
    *   **Time-Synchronized Scrubber**: A foot timeline slider to rewind, fast-forward, and single-step through nodes.
    *   **Typewriter Stream**: Side-by-side terminal log streaming token-by-token alongside active node selections.
    *   **Trajectory Forking**: Visually inspect the path taken during a self-correction branch versus the dangerous path originally calculated.

---

## 🧩 VS Code Extension Platform

The VS Code extension transforms the IDE into a dedicated AI cockpit:
*   **Secure Auth Integration**: Utilizes VS Code's native `SecretStorage` API to store JWT and refresh tokens isolated within the operating system's Keychain (macOS Keychain, Windows Credential Manager, or Linux Keyring).
*   **Deep-Link Integration**: Supports standard custom protocols (`vscode://aether.aether-vscode/auth-callback`) to sync browser-based web dashboard sessions instantly back to the editor.
*   **Cinematic Sidebar**: A premium carbon-dark sidebar showing signed-in user stats, real-time quota progress indicators, and an onboarding progress checklist.

### Compilation & Local Assembly:

```bash
# Move to vscode application workspace
cd apps/vscode

# Install dependencies
npm install

# Compile the typescript files
npm run compile

# Package the extension into a portable VSIX file
npx @vscode/vsce package --no-dependencies
```

This generates `aether-vscode-0.1.0.vsix` in the directory, which can be installed in VS Code via **Cmd + Shift + P -> "Extensions: Install from VSIX"**.

---

## 🔌 SDK Quickstart

### 1. Manual Session Logging

Create clean nodes programmatically using our Python context manager:

```python
import time
from aether import AgentTracer

tracer = AgentTracer(project="custom-agent")

with tracer.session(session_id="agent-run-101", agent_name="SupportGPT") as session:
    # 1. Start a reasoning block
    t1 = session.thought("Analyzing user database lookup request...", confidence=0.98)
    time.sleep(0.5)

    # 2. Invoke database tool call
    tc = session.tool_call(
        tool_name="db_query", 
        args={"user_id": 9928}, 
        parent_id=t1
    )
    time.sleep(0.3)

    # 3. Inject tool output
    session.tool_result(
        tool_call_id=tc, 
        result={"email": "allipuramsamanyu@gmail.com", "plan": "enterprise"}, 
        latency_ms=180
    )
```

### 2. Zero-Config Magical Auto-Tracing

Aether provides parameterless instrumentation. The SDK will automatically instantiate a thread-safe, local-first global tracer behind the scenes—no config hell, no databases, and zero setup nightmare:

```python
from aether.integrations.openai import instrument_openai
import openai

# Magical 1-line parameterless setup
client = instrument_openai(openai.OpenAI())
```

---

## 💳 Pricing & Plan Comparisons

Aether offers four robust SaaS plans configured with clear visual and functional feature gates inside both the SaaS application and the VS Code webview sidebar:

| Feature Capability | Free Core | Pro Tier | Premium | Enterprise |
| :--- | :--- | :--- | :--- | :--- |
| **Monthly Traces Quota** | 25 Traces / mo | Unlimited | Unlimited | Unlimited |
| **Telemetry History** | 7 Days | Persistent | Unlimited | Customizable |
| **Offline local replay** | Yes | Yes | Yes | Yes |
| **Cloud Sync & Share** | ❌ None | ✔️ Unlimited | ✔️ Unlimited | ✔️ Private VPC / Air-Gapped |
| **Visualizer Watermark** | ⚠️ Enabled | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| **Advanced Graph Nodes** | Basic | Advanced | Multi-Agent | ComplianceRBAC |
| **Pricing Rate** | **$0 / mo** | **$29 / mo** | **$79 / mo** | **Custom Quote** |

---

## 🚀 Onboarding Workflow

The Aether platform leads developers through a high-fidelity 6-step onboarding progression:
1.  **Welcome Dashboard**: Shows progress gauges detailing active SDK install states.
2.  **Session Pairing**: Instant click-to-sync button which deep-links the SaaS user state with the editor.
3.  **Command Center**: Quick one-click copy targets for the `pip install` commands.
4.  **SDK Setup**: Ready-to-go Python quickstart scripts.
5.  **First Cache Trace**: Generating local traces inside `.aether/traces/` on the local machine.
6.  **Interactive Exploration**: Selecting the newly compiled cache row in the explorer side-pane to reveal full timeline control inside VS Code.

---

## 🔒 OAuth Authentication Setup

Aether routes session tokens through safe OAuth standard mechanisms.

```
+------------+       Open Browser        +------------+
|  VS Code   | ========================> | Aether SaaS|
|  Extension |                           | Dashboard  |
+------------+                           +-----+------+
      ^                                        |
      | Redirect with Session JWT Tokens       |
      | (vscode://aether.aether-vscode/...)    |
      +----------------------------------------+
```

1.  Click **"Connect Aether Account"** in the sidebar.
2.  This directs the default browser to `http://localhost:3000/dashboard` containing the authenticated web session.
3.  Clicking **"Sync Session with VS Code"** issues a callback deep-link containing `accessToken`, `refreshToken`, `email`, and `userId` payload attributes.
4.  `AetherUriHandler` interceptor registers the credentials, synchronizes database checks dynamically, and unlocks the explorer state immediately.

---

## 📄 Trace JSON File Schema

Traces are serialized into portable JSON. Developers can share, store, and analyze these caches.

```json
{
  "events": [
    {
      "id": "node-101",
      "sessionId": "agent-session-x",
      "timestamp": "2026-05-20T12:00:00.000Z",
      "type": "thought",
      "parentId": null,
      "content": "Synthesizing cluster deployment roadmap.",
      "metadata": {
        "confidence": 0.98,
        "agentName": "ArchitectGPT"
      }
    },
    {
      "id": "node-102",
      "sessionId": "agent-session-x",
      "timestamp": "2026-05-20T12:00:01.000Z",
      "type": "tool_call",
      "parentId": "node-101",
      "content": "Issuing pod list verification.",
      "metadata": {
        "toolName": "kubectl",
        "command": "kubectl get pods"
      }
    }
  ]
}
```

---

## 🛠️ Integrations & CLI Tooling

The PyPI package installs the universal `aether` binary:

*   **Doctor Diagnosis (`aether doctor`)**: Scans folder system permissions, ensures directories are writable, and checks for port conflicts.
*   **ASCII Summaries (`aether inspect [session_id]`)**: Builds full colored hierarchy DAG paths directly inside terminal streams.
*   **Performance Metrics (`aether summarize [session_id]`)**: Renders latency distribution curves, total token metrics, and safety flags.

---

## 🛡️ Security Guarantees

Aether values database isolation:
*   **Row Level Security (RLS)**: Row-level security is enforced at the core Supabase schema. Every sync write validates the `Authorization: Bearer <JWT>` header, ensuring users can only read/write their own workspace records.
*   **Zero-Plaintext Store**: No passwords, access keys, or secrets are ever cached in raw text file databases. VS Code's `SecretStorage` handles absolute encryption natively.

---

## 🏢 Enterprise Architecture

Built for serious deployment requirements:
*   **Air-Gapped Operation**: Run 100% offline with zero external network attempts.
*   **Auditing and Controls**: Complete history retention, team workspace authorization roles, and customizable retention periods.
*   **Dedicated Deployments**: Fully compatible with AWS VPCs, Google Cloud Kubernetes, and custom PostgreSQL/pgvector cluster stores.

---

## 🩺 Troubleshooting & FAQ

#### 1. Why does my deep-link redirect fail to open?
Ensure your operating system supports deep-link association. If the link is blocked, run:
```bash
# Manual refresh in command line
aether refreshExplorer
```
Or check if another VS Code instance has locked the handler socket.

#### 2. How do I resolve port conflicts for the offline visualizer?
By default, the replay server uses port `3000`. If this is occupied, specify a custom port:
```bash
aether replay --port 8080
```

#### 3. How do I upgrade my account tier in the extension?
Click the **badge** inside the profile header to open Aether's central subscription settings page directly.

---

*Engineered for premium AI Reasoning Observability.*
