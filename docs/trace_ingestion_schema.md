# Aether Trace Ingestion Schema Specification
`Version 0.1.0-Draft`

Aether is a local-first, highly optimized cognitive debugger for AI agents. This document defines the **Aether Trace Ingestion Schema**, the open standard for representing AI thoughts, tool calls, memory retrievals, token streams, and safety hallucinations.

It also contains a live, **Cinematic Interactive Mini-Visualizer** built directly into this documentation so you can preview trace execution and state progressions interactively!

---

## 🌌 Interactive Trace Observatory
Below is a live, interactive simulation of a complex DevOps deployment trace utilizing the Aether schema, featuring active path highlights, confidence collapses, and self-correction. 

*Drag the scrubber or click Play to witness Aether's rendering engine in action!*

<div class="aether-docs-visualizer" style="
  background: #080812;
  border: 1px solid rgba(0, 242, 255, 0.15);
  border-radius: 16px;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #f8fafc;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 242, 255, 0.03);
  margin: 28px 0;
  max-width: 820px;
">
  <!-- Interactive Controller Header -->
  <div style="
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 16px;
    margin-bottom: 20px;
  ">
    <div>
      <span style="
        font-size: 10px;
        font-family: monospace;
        text-transform: uppercase;
        color: #00f2ff;
        background: rgba(0, 242, 255, 0.1);
        padding: 4px 8px;
        border-radius: 99px;
        font-weight: bold;
        letter-spacing: 0.05em;
      ">Live Documentation Demo</span>
      <h3 style="margin: 6px 0 0 0; font-size: 16px; font-weight: 800; color: #fff;">DevOps Guardrails & Self-Correction</h3>
    </div>
    
    <!-- Playback buttons -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <button id="play-btn" style="
        background: rgba(0, 242, 255, 0.1);
        border: 1px solid rgba(0, 242, 255, 0.3);
        color: #00f2ff;
        border-radius: 8px;
        width: 38px;
        height: 38px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        outline: none;
      " onclick="togglePlay()">
        <!-- Play Icon -->
        <svg id="play-icon" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        <!-- Pause Icon -->
        <svg id="pause-icon" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
      
      <button style="
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        border-radius: 8px;
        width: 38px;
        height: 38px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        outline: none;
      " onclick="resetScrubber()">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"/></svg>
      </button>
    </div>
  </div>

  <!-- Timeline Slider -->
  <div style="margin-bottom: 24px;">
    <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: #64748b; margin-bottom: 6px;">
      <span>Timeline Scrubber</span>
      <span id="step-counter">Step 1 / 10</span>
    </div>
    <input type="range" id="timeline-slider" min="0" max="9" value="0" style="
      width: 100%;
      height: 6px;
      border-radius: 99px;
      outline: none;
      background: rgba(255, 255, 255, 0.1);
      cursor: pointer;
      -webkit-appearance: none;
      accent-color: #00f2ff;
    " oninput="handleSliderChange(this.value)">
  </div>

  <!-- Layout: Left (Timeline List) & Right (Active Card Details) -->
  <div style="
    display: grid;
    grid-template-columns: 1fr 1.3fr;
    gap: 20px;
  ">
    <!-- Left Column: Steps -->
    <div style="
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px;
      max-height: 280px;
      overflow-y: auto;
    ">
      <div id="steps-list" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Filled by JS -->
      </div>
    </div>

    <!-- Right Column: Inspector Panel -->
    <div style="
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      min-height: 248px;
      transition: all 0.3s ease;
    " id="inspector-card">
      
      <!-- Top Neon Accent bar -->
      <div id="accent-line" style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #00f2ff;
        box-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
      "></div>
      
      <!-- Card Content -->
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div id="card-icon-container" style="
              width: 26px;
              height: 26px;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(0, 242, 255, 0.15);
            ">
              <!-- Dynamically set SVG icon -->
            </div>
            <div>
              <div id="card-type" style="
                font-size: 9px;
                font-family: monospace;
                font-weight: bold;
                letter-spacing: 0.1em;
                color: #00f2ff;
                text-transform: uppercase;
              ">THOUGHT</div>
              <div id="card-author" style="font-size: 11px; color: #64748b;">DevOpsGPT</div>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 6px;">
            <span id="card-latency" style="
              font-size: 10px;
              font-family: monospace;
              color: rgba(255, 255, 255, 0.4);
            ">45ms</span>
            <span id="card-confidence" style="
              font-size: 10px;
              font-family: monospace;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(16, 185, 129, 0.1);
              color: #10b981;
            ">99%</span>
          </div>
        </div>

        <!-- Node description content -->
        <p id="card-text" style="
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 14px 0;
          font-weight: 500;
        ">Analyzing user request: 'Deploy Aether Backend v1.2.0 image and clean historical caches.'</p>
      </div>

      <!-- Footer Info -->
      <div id="card-footer" style="
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 10px;
        font-size: 10px;
        font-family: monospace;
        color: #475569;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <span id="card-node-id">Node: high-n1</span>
        <span id="card-special-badge" style="
          color: #10b981;
          font-weight: bold;
          display: none;
        ">REVISED</span>
      </div>
    </div>
  </div>
</div>

<script>
  // ─── Simulation Script Data ────────────────────────────────────────────────
  const traceEvents = [
    {
      id: "high-n1",
      type: "thought",
      content: "Analyzing user request: 'Deploy Aether Backend v1.2.0 image to cluster and purge historical Nginx log cache files.'",
      latency: "45ms",
      confidence: "99%",
      confRating: "high",
      badge: "START",
      badgeColor: "#00f2ff"
    },
    {
      id: "high-n2",
      type: "memory",
      content: "Recalling AWS registry location: AWS ECR production endpoint 991823.dkr.ecr.us-east-1.amazonaws.com.",
      latency: "12ms",
      confidence: "100%",
      confRating: "high",
      badge: "PINE CONE DB",
      badgeColor: "#a855f7"
    },
    {
      id: "high-n3",
      type: "tool_call",
      content: "Executing pod query: kubectl get pods -n prod -o wide",
      latency: "150ms",
      confidence: "96%",
      confRating: "high",
      badge: "KUBECTL",
      badgeColor: "#eab308"
    },
    {
      id: "high-n4",
      type: "tool_result",
      content: "Cluster online. 3 deployment pods running healthy. Disk usage at 91%. Needs immediate log cache clean.",
      latency: "340ms",
      confidence: "100%",
      confRating: "high",
      badge: "RESULT",
      badgeColor: "#10b981"
    },
    {
      id: "high-n5",
      type: "thought",
      content: "I must purge historical Nginx log cache folders to recover disk overhead before deploying the updated backend container image.",
      latency: "32ms",
      confidence: "89%",
      confRating: "high",
      badge: "PLANNING",
      badgeColor: "#00f2ff"
    },
    {
      id: "high-n6",
      type: "tool_call",
      content: "Attempting sweeping cache cleanup command: rm -rf /var/log/nginx/*",
      latency: "80ms",
      confidence: "74%",
      confRating: "medium",
      badge: "BASH RUNNER",
      badgeColor: "#eab308"
    },
    {
      id: "high-n7",
      type: "hallucination",
      content: "CRITICAL RISK DETECTED: System guardrails blocked execution! Wildcard root deletion command detects unsafe path execution.",
      latency: "15ms",
      confidence: "24%",
      confRating: "collapse",
      badge: "⚠ INCIDENT RUPTURE",
      badgeColor: "#f43f5e"
    },
    {
      id: "high-n8",
      type: "thought",
      content: "Safety correction activated! Wildcard command rejected. Outdated files must be located and deleted using strict time and extension filters.",
      latency: "50ms",
      confidence: "100%",
      confRating: "revised",
      badge: "REVISED THOUGHT",
      badgeColor: "#10b981"
    },
    {
      id: "high-n9",
      type: "tool_call",
      content: "Executing filtered targeted safe purge: find /var/log/nginx -name '*.log' -mtime +14 -delete",
      latency: "90ms",
      confidence: "99%",
      confRating: "high",
      badge: "SAFE BASH",
      badgeColor: "#eab308"
    },
    {
      id: "high-n10",
      type: "tool_result",
      content: "Safe delete finished successfully. Disk space cleared (Recovered 1.84 GB). Ready to rollout container backend update.",
      latency: "120ms",
      confidence: "100%",
      confRating: "high",
      badge: "STABILIZED",
      badgeColor: "#10b981"
    }
  ];

  // Icons registry
  const icons = {
    thought: `<svg width="14" height="14" fill="none" stroke="#00f2ff" stroke-width="2" viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.95.5M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.95.5M12 11h.01M6.5 12h.01M17.5 12h.01M9 16.5h6"/></svg>`,
    memory: `<svg width="14" height="14" fill="none" stroke="#a855f7" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0018 0V5M3 12a9 3 0 0018 0"/></svg>`,
    tool_call: `<svg width="14" height="14" fill="none" stroke="#eab308" stroke-width="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>`,
    tool_result: `<svg width="14" height="14" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    hallucination: `<svg width="14" height="14" fill="none" stroke="#f43f5e" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/></svg>`
  };

  // State elements
  let activeIndex = 0;
  let playInterval = null;

  function renderSteps() {
    const listContainer = document.getElementById("steps-list");
    listContainer.innerHTML = "";
    
    traceEvents.forEach((evt, idx) => {
      const isPastOrActive = idx <= activeIndex;
      const isActive = idx === activeIndex;
      
      const stepRow = document.createElement("div");
      stepRow.style.display = "flex";
      stepRow.style.alignItems = "center";
      stepRow.style.gap = "10px";
      stepRow.style.padding = "8px 10px";
      stepRow.style.borderRadius = "8px";
      stepRow.style.cursor = "pointer";
      stepRow.style.transition = "all 0.2s ease";
      
      if (isActive) {
        stepRow.style.background = "rgba(0, 242, 255, 0.08)";
        stepRow.style.border = "1px solid rgba(0, 242, 255, 0.2)";
      } else {
        stepRow.style.background = "transparent";
        stepRow.style.border = "1px solid transparent";
      }
      
      stepRow.onclick = () => {
        clearInterval(playInterval);
        playInterval = null;
        updatePlaybackUI();
        updateActiveIndex(idx);
      };
      
      let dotColor = "rgba(255, 255, 255, 0.15)";
      if (isPastOrActive) {
        if (evt.type === "hallucination") dotColor = "#f43f5e";
        else if (evt.type === "thought") dotColor = "#00f2ff";
        else if (evt.type === "memory") dotColor = "#a855f7";
        else if (evt.type === "tool_call") dotColor = "#eab308";
        else dotColor = "#10b981";
      }
      
      stepRow.innerHTML = `
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: \${dotColor};
          box-shadow: \${isActive ? '0 0 10px ' + dotColor : 'none'};
          flex-shrink: 0;
          transition: all 0.3s ease;
        "></div>
        <div style="
          font-size: 11px;
          font-family: monospace;
          color: \${isActive ? '#fff' : isPastOrActive ? '#cbd5e1' : '#475569'};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-grow: 1;
        ">\${evt.badge}: \${evt.content}</div>
      `;
      listContainer.appendChild(stepRow);
    });
  }

  function updateActiveIndex(idx) {
    activeIndex = parseInt(idx);
    document.getElementById("timeline-slider").value = activeIndex;
    document.getElementById("step-counter").innerText = `Step \${activeIndex + 1} / 10`;
    
    const activeEvt = traceEvents[activeIndex];
    
    // Update active inspector panel contents
    document.getElementById("card-type").innerText = activeEvt.type.replace("_", " ");
    document.getElementById("card-text").innerText = activeEvt.content;
    document.getElementById("card-latency").innerText = activeEvt.latency;
    document.getElementById("card-confidence").innerText = activeEvt.confidence;
    document.getElementById("card-node-id").innerText = `Node: \${activeEvt.id}`;
    
    // Update Colors based on active type
    const card = document.getElementById("inspector-card");
    const accent = document.getElementById("accent-line");
    const iconContainer = document.getElementById("card-icon-container");
    const confidenceBadge = document.getElementById("card-confidence");
    const specialBadge = document.getElementById("card-special-badge");
    
    iconContainer.innerHTML = icons[activeEvt.type] || icons.thought;
    
    // Clean any hot-loop classes or special styling
    card.style.borderColor = "rgba(255, 255, 255, 0.06)";
    card.style.background = "rgba(255, 255, 255, 0.02)";
    card.style.boxShadow = "none";
    specialBadge.style.display = "none";
    
    // Custom colors & breathing effects per type
    if (activeEvt.type === "hallucination") {
      accent.style.background = "#f43f5e";
      accent.style.boxShadow = "0 0 12px #f43f5e";
      document.getElementById("card-type").style.color = "#f43f5e";
      iconContainer.style.background = "rgba(244, 63, 94, 0.15)";
      confidenceBadge.style.background = "rgba(244, 63, 94, 0.15)";
      confidenceBadge.style.color = "#f43f5e";
      
      // Critical Breach Crimson glow style
      card.style.borderColor = "rgba(244, 63, 94, 0.4)";
      card.style.background = "rgba(244, 63, 94, 0.04)";
      card.style.boxShadow = "0 0 35px rgba(244, 63, 94, 0.12)";
    } else if (activeEvt.confRating === "revised") {
      accent.style.background = "#10b981";
      accent.style.boxShadow = "0 0 12px #10b981";
      document.getElementById("card-type").style.color = "#10b981";
      iconContainer.style.background = "rgba(16, 185, 129, 0.15)";
      confidenceBadge.style.background = "rgba(16, 185, 129, 0.15)";
      confidenceBadge.style.color = "#10b981";
      
      // Revised Highlight
      specialBadge.style.display = "inline";
      specialBadge.innerText = "SELF REVISED";
      specialBadge.style.color = "#10b981";
      specialBadge.style.background = "rgba(16, 185, 129, 0.1)";
      specialBadge.style.padding = "2px 6px";
      specialBadge.style.borderRadius = "4px";
    } else if (activeEvt.type === "memory") {
      accent.style.background = "#a855f7";
      accent.style.boxShadow = "0 0 10px rgba(168, 85, 247, 0.4)";
      document.getElementById("card-type").style.color = "#a855f7";
      iconContainer.style.background = "rgba(168, 85, 247, 0.15)";
      confidenceBadge.style.background = "rgba(168, 85, 247, 0.15)";
      confidenceBadge.style.color = "#a855f7";
    } else if (activeEvt.type === "tool_call") {
      accent.style.background = "#eab308";
      accent.style.boxShadow = "0 0 10px rgba(234, 179, 8, 0.4)";
      document.getElementById("card-type").style.color = "#eab308";
      iconContainer.style.background = "rgba(234, 179, 8, 0.15)";
      confidenceBadge.style.background = "rgba(234, 179, 8, 0.15)";
      confidenceBadge.style.color = "#eab308";
    } else {
      // standard cyan thought or green result
      const color = activeEvt.type === "tool_result" ? "#10b981" : "#00f2ff";
      accent.style.background = color;
      accent.style.boxShadow = `0 0 10px \${color}`;
      document.getElementById("card-type").style.color = color;
      iconContainer.style.background = `rgba(\${activeEvt.type === "tool_result" ? '16, 185, 129' : '0, 242, 255'}, 0.15)`;
      confidenceBadge.style.background = `rgba(\${activeEvt.type === "tool_result" ? '16, 185, 129' : '0, 242, 255'}, 0.15)`;
      confidenceBadge.style.color = color;
    }
    
    renderSteps();
  }

  function handleSliderChange(val) {
    clearInterval(playInterval);
    playInterval = null;
    updatePlaybackUI();
    updateActiveIndex(val);
  }

  function togglePlay() {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    } else {
      if (activeIndex >= 9) {
        activeIndex = 0;
      }
      playInterval = setInterval(() => {
        if (activeIndex < 9) {
          updateActiveIndex(activeIndex + 1);
        } else {
          clearInterval(playInterval);
          playInterval = null;
          updatePlaybackUI();
        }
      }, 2200);
    }
    updatePlaybackUI();
  }

  function resetScrubber() {
    clearInterval(playInterval);
    playInterval = null;
    updatePlaybackUI();
    updateActiveIndex(0);
  }

  function updatePlaybackUI() {
    const playIcon = document.getElementById("play-icon");
    const pauseIcon = document.getElementById("pause-icon");
    const playBtn = document.getElementById("play-btn");
    
    if (playInterval) {
      playIcon.style.display = "none";
      pauseIcon.style.display = "block";
      playBtn.style.background = "rgba(244, 63, 94, 0.15)";
      playBtn.style.borderColor = "rgba(244, 63, 94, 0.3)";
      playBtn.style.color = "#f43f5e";
    } else {
      playIcon.style.display = "block";
      pauseIcon.style.display = "none";
      playBtn.style.background = "rgba(0, 242, 255, 0.1)";
      playBtn.style.borderColor = "rgba(0, 242, 255, 0.3)";
      playBtn.style.color = "#00f2ff";
    }
  }

  // Initialize
  updateActiveIndex(0);
</script>

---

## 📋 Open standard Aether Trace Ingestion Schema
Traces represent structured execution runs emitted by AI agents or cognitive runtimes. Each trace contains high-level metadata and an array of ordered `events`.

### Ingestion Payload Structure
Ingested trace sessions are stored as unified `JSON` files. Below is the complete schema definition:

```json
{
  "$schema": "https://aetherai.dev/schemas/trace-v1.json",
  "session_id": "uuid-v4-or-slug",
  "timestamp": "ISO-8601-UTC-timestamp",
  "agent_name": "Identifier of the agent platform",
  "metadata": {
    "version": "1.2.0",
    "environment": "production"
  },
  "events": []
}
```

---

### 📦 Event Node Schema Definitions
All elements inside the `events` array are sub-classes of the foundational Node base schema.

#### Common Event Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | A unique cryptographic slug identifying the event. |
| `sessionId` | `string` | **Yes** | Matches the parent trace session_id. |
| `timestamp` | `string` | **Yes** | ISO-8601 UTC timestamp. |
| `type` | `enum` | **Yes** | The operational node classifier (see types below). |
| `parentId` | `string` | No | Parent event ID, establishing the DAG tree structure. |
| `content` | `string` | **Yes** | Raw visual description, prompt string, or execution output. |
| `metadata` | `object` | No | Variable dictionary mapping properties (latency, tokens, confidence). |

---

### 📂 Node Classifications (`type`)

#### 1. `thought`
Represents an internal deliberation, planning, reasoning, or logical deduction step of the agent.
*   **Specialized Metadata**:
    *   `confidence` (`float`, `0.0 - 1.0`): The evaluated probability score of correct logical execution. A drop below `0.6` triggers an amber heatmap loop. A drop below `0.45` triggers a crimson warning loop.
    *   `selfCorrection` (`boolean`): Flags the thought as a modified trajectory correction node.

#### 2. `tool_call`
An invocation of an external integration, sandbox script, or vector database retrieve call.
*   **Specialized Metadata**:
    *   `toolName` (`string`): The explicit identifier of the function called.
    *   `args` (`object`): Structured key-value object containing execution inputs.

#### 3. `tool_result`
The return response payload from a preceding `tool_call` event.
*   **Specialized Metadata**:
    *   `latency` (`integer`): Execution duration in milliseconds.
    *   `status` (`enum: success | error`): Status return classifier.

#### 4. `memory`
Deliberate state serialization, retrieval, or updates to database tables, context windows, or vector backends.
*   **Specialized Metadata**:
    *   `source` (`string`): Database name or source registry.

#### 5. `hallucination`
Instantiated dynamically by Aether guardrails, LLM self-checks, or assertion protocols when a reasoning break, path rupture, or structural error is detected.
*   **Specialized Metadata**:
    *   `detector` (`string`): The guardrail system which triggered the alarm.
    *   `severity` (`enum: warning | critical`): Impact severity score.

---

## 🔌 Ingestion Integration Example
Here is how you ingest and trace events in Python using Aether's core package in less than 4 lines of code:

```python
from aether import AetherTracer

# 1. Instantiate the telemetry connection
with AetherTracer(session_id="deploy-v12") as tracer:
    
    # 2. Trace internal thought deliberating plan
    tracer.thought("Deploying backend package and cleaning logs", confidence=0.99)
    
    # 3. Call tool and trace automatically
    tracer.memory_recall("AWS ECR Endpoint lookup", source="pinecone")
    res = tracer.tool_call("kubectl", command="kubectl get pods")
    
    # 4. Triggers automatic safety hooks if anomaly detected
    if "blocked" in res:
        tracer.hallucination("Unsafe wildcard blocked by guardrails", severity="critical")
```

---
> [!TIP]
> **Performance Recommendation**: For high-frequency agent loop runs, Aether maintains an air-gapped internal cache buffer and writes to `.aether/traces/` asynchronously, ensuring zero performance penalties on agent execution.
