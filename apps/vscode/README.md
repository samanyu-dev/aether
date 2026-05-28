# Aether VSCode Extension Prototype

Visual cognition replay and interactive debugging for AI agents inside VSCode.

## Features

- **Trace Explorer**: Automatic sidebar scanning of `.aether/traces/*.json` sessions inside your active workspace.
- **Cognition Timeline Scrubber**: Step-by-step traversal controls (Play, Pause, Reset, Scrubber) to walk through the agent's thought chain chronologically.
- **Node Inspector**: Visual, type-colored nodes mapping thoughts, vector database recalls, tool actions, and hallucinations in detail.
- **Live Watcher**: Sidebar automatically refreshes instantly when your Python agent outputs a new trace.

## Requirements

Requires your AI agents to be instrumented with the Python SDK `aether-observe` generating local trace logs inside the `.aether/` workspace folder.
