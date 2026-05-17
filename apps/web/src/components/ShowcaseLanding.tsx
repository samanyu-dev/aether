"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Cpu, 
  Brain, 
  AlertTriangle, 
  Terminal, 
  GitBranch, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useAetherStore, AetherEvent } from "@/store/useAetherStore";

// Static definitions of the 3 demos so they load INSTANTLY offline
const DEMOS: Record<string, { title: string; description: string; events: AetherEvent[] }> = {
  simple: {
    title: "Simple Reasoning",
    description: "Introductory 4-node quantum computing tutor trace.",
    events: [
      {
        id: "1", sessionId: "simple-reasoning-demo", timestamp: new Date().toISOString(),
        type: "thought", parentId: undefined, content: "Analyzing user request: 'Explain quantum computing simply'",
        metadata: { confidence: 0.99, agentName: "TutorGPT" }
      },
      {
        id: "2", sessionId: "simple-reasoning-demo", timestamp: new Date().toISOString(),
        type: "thought", parentId: "1", content: "Breaking down core concepts: Superposition and Entanglement.",
        metadata: { confidence: 0.95 }
      },
      {
        id: "3", sessionId: "simple-reasoning-demo", timestamp: new Date().toISOString(),
        type: "thought", parentId: "2", content: "Formulating physical analogy: A spinning coin instead of heads or tails.",
        metadata: { confidence: 0.92 }
      },
      {
        id: "4", sessionId: "simple-reasoning-demo", timestamp: new Date().toISOString(),
        type: "system", parentId: "1", content: "Response generation complete.",
        metadata: {}
      }
    ]
  },
  tool: {
    title: "Multi-Tool Agent",
    description: "LoRA fine-tuning research agent with latency tracing.",
    events: [
      {
        id: "1", sessionId: "tool-agent-demo", timestamp: new Date().toISOString(),
        type: "thought", parentId: undefined, content: "Objective: Find recent papers on LoRA fine-tuning.",
        metadata: { confidence: 0.98, agentName: "ResearchGPT" }
      },
      {
        id: "2", sessionId: "tool-agent-demo", timestamp: new Date().toISOString(),
        type: "memory", parentId: "1", content: "Recalling user preference: prefers CVPR and NeurIPS venues.",
        metadata: { source: "pinecone-vector-db" }
      },
      {
        id: "3", sessionId: "tool-agent-demo", timestamp: new Date().toISOString(),
        type: "tool_call", parentId: "1", content: "Querying arXiv search index...",
        metadata: { toolName: "arxiv_search", query: "LoRA OR Low-Rank Adaptation" }
      },
      {
        id: "4", sessionId: "tool-agent-demo", timestamp: new Date().toISOString(),
        type: "tool_result", parentId: "3", content: "Found 14 relevant papers. Top match: 'QLoRA: Efficient Finetuning'",
        metadata: { latency: 342, results_count: 14 }
      },
      {
        id: "5", sessionId: "tool-agent-demo", timestamp: new Date().toISOString(),
        type: "thought", parentId: "4", content: "Synthesizing research summary and generating markdown report.",
        metadata: { confidence: 0.96 }
      }
    ]
  },
  hallucination: {
    title: "Hallucination & Correction",
    description: "DevOps agent attempting risky script commands and self-correcting.",
    events: [
      {
        id: "1", sessionId: "hallucination-demo", timestamp: new Date().toISOString(),
        type: "thought", parentId: undefined, content: "Generating DevOps Python script to clean up old log files.",
        metadata: { confidence: 0.99, agentName: "DevOpsGPT" }
      },
      {
        id: "2", sessionId: "hallucination-demo", timestamp: new Date().toISOString(),
        type: "tool_call", parentId: "1", content: "Proposing server execution command.",
        metadata: { toolName: "bash_run", command: "rm -rf /var/log/*" }
      },
      {
        id: "3", sessionId: "hallucination-demo", timestamp: new Date().toISOString(),
        type: "hallucination", parentId: "2", content: "CRITICAL SAFETY VIOLATION: Agent is attempting destructive wildcard deletion on root without validation.",
        metadata: { severity: "high", detector: "Aether Guardrails" }
      },
      {
        id: "4", sessionId: "hallucination-demo", timestamp: new Date().toISOString(),
        type: "thought", parentId: "3", content: "Self-Correction triggered. Safety guardrail active. Switching to safe file search and target delete.",
        metadata: { confidence: 1.0, selfCorrection: true }
      },
      {
        id: "5", sessionId: "hallucination-demo", timestamp: new Date().toISOString(),
        type: "tool_call", parentId: "4", content: "Issuing safe command execution.",
        metadata: { toolName: "bash_run", command: "find /var/log -name '*.log' -mtime +30 -exec rm {} \\;" }
      },
      {
        id: "6", sessionId: "hallucination-demo", timestamp: new Date().toISOString(),
        type: "tool_result", parentId: "5", content: "Targeted clean complete. 42 outdated log files safely removed.",
        metadata: { latency: 87 }
      }
    ]
  }
};

export const ShowcaseLanding = () => {
  const loadReplay = useAetherStore((s) => s.loadReplay);
  const [activeTab, setActiveTab] = useState<"flow" | "engine" | "lifecycle">("flow");

  const runDemoSession = (key: keyof typeof DEMOS) => {
    const demo = DEMOS[key];
    loadReplay(demo.events as AetherEvent[]);
    setTimeout(() => {
      useAetherStore.getState().computeGraph();
    }, 50);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-8 py-10 flex flex-col items-center justify-start bg-[#020205]/60 z-10 custom-scrollbar select-none">
      
      {/* ── HERO BANNER ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-[10px] font-mono font-semibold tracking-wider uppercase mb-4 shadow-[0_0_15px_rgba(0,242,255,0.1)]">
          <Sparkles size={10} className="animate-pulse" />
          Cinematic AI Trace Observatory
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white/90 bg-clip-text">
          Visualize AI Reasoning <span className="text-cyan-400">In Realtime</span>
        </h1>
        <p className="text-sm text-white/40 mt-3 leading-relaxed max-w-xl mx-auto">
          A highly-optimized, lightweight developer tool for tracing multi-agent workflows, diagnosing hallucinations, and replaying token streams at 60fps.
        </p>
      </motion.div>

      {/* ── THE THREE ONE-CLICK DEMOS (Task 6 Wow Moment) ── */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        {Object.entries(DEMOS).map(([key, demo]) => (
          <motion.div
            key={key}
            whileHover={{ y: -4, scale: 1.01 }}
            className="group relative rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 hover:bg-white/[0.02] hover:border-cyan-500/20 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            onClick={() => runDemoSession(key)}
          >
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={14} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white/80 group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                {key === "simple" && <Brain size={14} className="text-cyan-400" />}
                {key === "tool" && <Cpu size={14} className="text-amber-400" />}
                {key === "hallucination" && <AlertTriangle size={14} className="text-rose-400" />}
                {demo.title}
              </h3>
              <p className="text-xs text-white/30 mt-2 leading-relaxed">
                {demo.description}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider">
                {demo.events.length} Nodes
              </span>
              <span className="text-[10px] font-medium text-cyan-400/80 group-hover:text-cyan-400 flex items-center gap-1 transition-colors">
                Launch Replay <ArrowRight size={10} />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── ARCHITECTURE VISUALIZATION PANEL (Task 3) ── */}
      <div className="w-full max-w-4xl border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 mb-14">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.04] pb-4 mb-6 gap-4">
          <div>
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
              <GitBranch size={14} className="text-cyan-400" />
              Observatory Architecture
            </h2>
            <p className="text-[11px] text-white/30 mt-0.5">
              Lightweight, low-latency telemetry flow engineered for unified memory.
            </p>
          </div>
          <div className="flex gap-1.5 bg-white/[0.02] p-1 rounded-lg border border-white/[0.04]">
            {[
              { id: "flow", label: "Event Flow" },
              { id: "engine", label: "Replay Engine" },
              { id: "lifecycle", label: "Node Lifecycle" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "flow" | "engine" | "lifecycle")}
                className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                  activeTab === tab.id 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-44 w-full flex items-center justify-center relative overflow-hidden bg-black/25 rounded-xl border border-white/[0.02]">
          <AnimatePresence mode="wait">
            {activeTab === "flow" && (
              <motion.div 
                key="flow"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full flex items-center justify-around px-8 font-mono text-[10px]"
              >
                {[
                  { label: "AI Agent", color: "text-white/60" },
                  { label: "Python SDK", color: "text-yellow-400/80" },
                  { label: "WS Connection", color: "text-cyan-400" },
                  { label: "Replay Engine", color: "text-purple-400" },
                  { label: "DAG Renderer", color: "text-emerald-400" }
                ].map((node, i, arr) => (
                  <React.Fragment key={node.label}>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse text-cyan-400" />
                      <span className={`${node.color} font-bold`}>{node.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="h-0.5 w-16 bg-gradient-to-r from-cyan-500/10 to-cyan-500/40 relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 w-2 bg-cyan-400 animate-[marquee_2s_linear_infinite]" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </motion.div>
            )}

            {activeTab === "engine" && (
              <motion.div 
                key="engine"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full flex items-center justify-around px-8 font-mono text-[10px]"
              >
                {[
                  { label: "Telemetry Ingestion", desc: "WebSocket events buffer" },
                  { label: "Linear Sequencer", desc: "Timeline scrubber" },
                  { label: "State Dispatched", desc: "Central store sync" },
                  { label: "Dagre Layout", desc: "Perfect DAG scaling" }
                ].map((step, i, arr) => (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center text-center p-3 rounded-lg border border-white/[0.02] bg-white/[0.01]">
                      <span className="text-white/80 font-bold">{step.label}</span>
                      <span className="text-[8px] text-white/30 mt-1">{step.desc}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="text-white/20 font-bold">→</div>
                    )}
                  </React.Fragment>
                ))}
              </motion.div>
            )}

            {activeTab === "lifecycle" && (
              <motion.div 
                key="lifecycle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full flex items-center justify-around px-8 font-mono text-[10px]"
              >
                {[
                  { type: "THOUGHT", label: "Superposition", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5" },
                  { type: "TOOL_CALL", label: "arxiv_search", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
                  { type: "HALLUCINATION", label: "rm -rf risk", color: "text-rose-400 border-rose-500/20 bg-rose-500/5" },
                  { type: "SELF_CORRECTION", label: "find safe command", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" }
                ].map((node, i, arr) => (
                  <React.Fragment key={node.type}>
                    <div className={`border rounded-lg px-3 py-2 flex flex-col items-center gap-1 ${node.color}`}>
                      <span className="text-[8px] font-bold tracking-widest">{node.type}</span>
                      <span className="text-white/70">{node.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="text-white/20 font-bold">→</div>
                    )}
                  </React.Fragment>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── SETUP & DEVELOPER QUICKSTART GUIDE (Task 6) ── */}
      <div className="w-full max-w-4xl border border-white/[0.04] bg-[#030307]/80 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="max-w-md">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400" />
            Integrate With Your Agents
          </h3>
          <p className="text-xs text-white/30 mt-2 leading-relaxed">
            Aether includes a clean Python SDK that supports async operations, tool tracing, and custom guardrails. Run the tracer in your local projects in under 3 lines of code.
          </p>
        </div>
        <div className="w-full md:w-auto shrink-0 bg-black/60 border border-white/5 rounded-xl px-4 py-3 font-mono text-xs text-cyan-400 flex items-center justify-between gap-4 shadow-inner">
          <code>pip install aether-observe</code>
          <span className="text-[9px] uppercase tracking-wider text-white/20 font-bold border border-white/10 rounded px-1.5 py-0.5">
            PyPI
          </span>
        </div>
      </div>

    </div>
  );
};
