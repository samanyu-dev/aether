# Aether 🌌 — Replay and debug AI cognition visually.

### **Watch AI agents think in realtime. Inspect reasoning trees, replay traces offline, auto-trace OpenAI & LangChain, and debug hallucinations inside VSCode.**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](https://opensource.org/licenses/MIT)
[![PyPI Version](https://img.shields.io/pypi/v/aether-observe.svg?color=purple)](https://pypi.org/project/aether-observe/)
[![Vercel Replay](https://img.shields.io/badge/Vercel-Interactive_Observatory-cyan.svg)](https://aether-observatory.vercel.app)
[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces-yellow)](https://huggingface.co/spaces/Sammy1808/aether)

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

## 💡 Why Aether?

AI agents are becoming impossible to debug with logs alone. Aether lets developers **replay reasoning like source code execution**, visually traversing thoughts, vector memories, external tool calls, and safety recovery guardrails in real-time.

*   🏡 **Local-First & Private:** Traces are saved locally in `.aether/traces/` as portable JSON runs. No cloud database, no third-party APIs, and zero infrastructure cost.
*   ⏱️ **Offline stand-alone Visualizer:** The PyPI package comes completely pre-bundled with a fully compiled Next.js visualizer. Spin up the server with `aether replay` and play back trace sessions completely offline, instantly.
*   🧠 **ANSI Colored CLI Explorer:** Search, inspect, and preview thought trees inside your terminal using `aether list`, `aether inspect`, and compute latency/token summaries with `aether summarize`.
*   🔌 **1-Line Framework Wrapping:** Auto-wrap your `OpenAI` client or pass `AetherCallbackHandler` directly to LangChain to stream reasoning, tool calls, and typewriter tokens at 60fps out-of-the-box.
*   🧩 **VSCode Extension IDE Integration:** Scan workspace trace folders dynamically, select agent sessions inside a native Sidebar Tree View, and open interactive visualizers right next to your editor.

---

## 🛠️ Monorepo Workspace Structure

```bash
apps/
  ├── web/               # Next.js 16 Web Observatory Visualizer (ReactFlow, Zustand)
  └── vscode/            # Aether VSCode Extension (Activity Bar, Sidebar Explorer, Webview Panel)
packages/
  └── sdk-python/        # aether-observe Python SDK (Local flusher, CLI parser, Auto-wrappers)
recordings/
  └── *.json             # Portable offline session recordings (Sync-ready)
examples/
  └── quickstart_*.py    # Integration tutorial script with mock completions
```

---

## 📦 PyPI Package & CLI Tooling

Install the official Python package natively:

```bash
pip install aether-observe
```

### 🩺 Diagnostic Health Check (`aether doctor`)
Verify folder permissions, writable trace repositories, and offline asset setups in one command:

```bash
aether doctor
```

### 📊 Summarize Agent Performance (`aether summarize`)
Compute execution statistics, tool latency, memory recall counts, hallucination rate, and estimated token counts:

```bash
aether summarize [session_id]
```

### 🧠 CLI ASCII Thought Trees (`aether inspect`)
Render structured hierarchical loops, parent-child flows, and type-colored cards directly in your terminal:

```bash
aether inspect [session_id]
```

### 🌌 Offline Replay Server (`aether replay`)
Launch the pre-bundled standalone visualizer local web server and auto-open it in your default web browser:

```bash
aether replay [--port 3000]
```

---

## 🔌 1-Line Framework Integrations

### 1. OpenAI Chat Completions Wrapping
Intercept completions to automatically log prompts, tool requests, token usage, latency, and typewriter outputs:

```python
from aether import AgentTracer
from aether.integrations.openai import trace_openai
import openai

tracer = AgentTracer(project="openai-agent")
client = openai.OpenAI()

# Wrap the client in 1 line!
trace_openai(client, tracer)

# Standard completions will now write local traces automatically!
response = client.chat.completions.create(
    model="gpt-4-turbo",
    messages=[{"role": "user", "content": "What is the capital of France?"}]
)
```

### 2. LangChain Native Callbacks Handler
Pass the native callback handler directly to chains, prompt run templates, or agents to capture nested steps:

```python
from aether import AgentTracer
from aether.integrations.langchain import AetherCallbackHandler
from langchain.chat_models import ChatOpenAI

tracer = AgentTracer(project="langchain-agent")
handler = AetherCallbackHandler(tracer)

# Pass callback handler to your LangChain runner!
llm = ChatOpenAI(callbacks=[handler])
```

---

## 🧩 VSCode IDE Extension Setup

The Aether VSCode Extension provides side-by-side agent debugging inside the editor:

1. **Workspace Scanning:** Scans `.aether/traces/` inside your active project directory.
2. **Sidebar Explorer Tree:** Auto-discovers, labels, and displays trace sessions chronologically in the Activity Bar.
3. **Interactive Panel:** Clicking a trace launches a native editor Webview panel rendering node connections, collapsible typewriter thoughts, and live play-scrubbing.

### How to Compile Locally:

```bash
cd apps/vscode
npm install
npm run compile
```

Open `apps/vscode` in VSCode and press **F5** to start an isolated Extension Development Host to test live!

---

## 🌎 Live Sandbox Showcases
*   **Vercel Interactive Sandbox**: [aether-observatory.vercel.app](https://aether-observatory.vercel.app)
*   **Hugging Face Playground**: [huggingface.co/spaces/Aether-AI](https://huggingface.co/spaces)

*Engineered for premium AI Reasoning Observability.*
