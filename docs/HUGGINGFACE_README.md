---
title: Aether AI Cognition Observatory
emoji: 🌌
colorFrom: indigo
colorTo: cyan
sdk: static
pinned: false
---

# Aether 🌌 — Interactive AI Cognition Sandbox Playground

Aether is a highly-optimized, lightweight static web application for replaying AI reasoning trajectories at a fluid 60fps.

This Hugging Face Space runs entirely client-side, avoiding heavy databases, backend GPU dependencies, or setup overhead, allowing you to instantly scrub through reasoning timelines, trace multi-agent tool execution latencies, and observe guardrail self-corrections.

## 🕹️ Interactive Features
*   **Static Cognition Trajectories**: Runs pre-compiled offline trace files (Simple Reasoning, Multi-Tool Agent, and DevOps Hallucination Interventions) with a single click.
*   **Drag-and-Drop Local Traces**: Drop any local Aether JSON log to visually replay complex agent trees instantly on the interactive canvas.
*   **Narrative Reasoning Overlay**: Real-time human-readable subtitles translating dry system event telemetry into readable thoughts and actions.

## 🚀 How to Deploy Your Own Static Sandbox to HF Spaces
If you are hosting Aether on your own Hugging Face Space:

1.  **Create a New Space**: Select **Static** as the SDK environment.
2.  **Build the Project**: Run `npm run build` in Aether's Next.js web application (`apps/web`), producing a static `apps/web/out/` folder.
3.  **Upload to Files**: Push the entire contents of the compiled `apps/web/out/` folder directly to the Hugging Face Space git repository.
4.  **Enjoy Zero-Cost Hosting**: Hugging Face will serve your Observatory canvas worldwide with zero infrastructure cost or runtime limits!
