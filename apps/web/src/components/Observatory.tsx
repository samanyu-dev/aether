"use client";
import React, { useMemo, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  EdgeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { useAetherStore, AetherEvent } from "@/store/useAetherStore";
import AetherNode from "@/components/AetherNode";
import AetherEdge from "@/components/AetherEdge";
import { AgentInspector } from "@/components/AgentInspector";
import { ShowcaseLanding } from "@/components/ShowcaseLanding";
import { useAetherWebSocket } from "@/hooks/useAetherWebSocket";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Upload,
  Brain,
  AlertTriangle,
  X,
  Home,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const nodeTypes: NodeTypes = {
  aetherNode: AetherNode,
};

const edgeTypes: EdgeTypes = {
  aetherEdge: AetherEdge,
};

const getNarrationForEvent = (event: AetherEvent): string => {
  const meta = event.metadata || {};
  const agent = String(meta.agentName || "Agent");

  switch (event.type) {
    case "thought":
      if (!event.parentId) {
        return `🤖 [${agent}] initiated reasoning cycle for high-level goal: "${event.content}"`;
      }
      if (meta.selfCorrection) {
        return `🧠 Safety correction activated! Redirecting logic to safe alternative command.`;
      }
      return `💡 Refining logical step: "${event.content}"`;

    case "tool_call":
      const tool = String(meta.toolName || "external tool");
      const cmd = meta.command ? `: "${meta.command}"` : "";
      return `🔧 [${agent}] calling ${tool} to gather external evidence${cmd}.`;

    case "tool_result":
      const latency = meta.latency ? ` in ${meta.latency}ms` : "";
      return `⚡ Received tool outcome${latency}: "${event.content}"`;

    case "memory":
      const source = meta.source ? ` [${meta.source}]` : "";
      return `💾 Accessing vector DB memory store${source} to fetch context: "${event.content}"`;

    case "hallucination":
      const detector = meta.detector || "guardrails";
      return `⚠️ DANGER: [${detector}] intercepted an anomalous wild-card command attempt! Pre-emptively blocking action.`;

    case "system":
      return `⚙️ System signal: "${event.content}"`;

    default:
      return event.content;
  }
};

const CaptionTypewriter = ({ text, speed = 10 }: { text: string; speed?: number }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        if (index === 0) return text.charAt(0);
        return prev + text.charAt(index);
      });
      index++;
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);
    return () => {
      clearInterval(interval);
      setDisplayed("");
    };
  }, [text, speed]);

  return <span>{displayed}</span>;
};

// ─── Inner Component (needs ReactFlowProvider) ──────────────────────────────

const ObservatoryInner = () => {
  const computeGraph = useAetherStore((s) => s.computeGraph);
  const { nodes, edges, activeSession, isConnected, events } = useAetherStore();
  const clearEvents = useAetherStore((s) => s.clearActiveEvents);
  const loadReplay = useAetherStore((s) => s.loadReplay);
  const setTimelinePosition = useAetherStore((s) => s.setTimelinePosition);
  const timelinePosition = useAetherStore((s) => s.timelinePosition);
  useAetherWebSocket(activeSession || "demo-session");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [introActive, setIntroActive] = useState(false);
  const [endingActive, setEndingActive] = useState(false);
  const { setCenter } = useReactFlow();

  // Dynamic session subtitle for cinematic intro
  const sessionTitle = useMemo(() => {
    if (!activeSession) return "";
    if (activeSession.includes("hallucination")) return "Hallucination Intercept & Safety Recovery Workflow";
    if (activeSession.includes("tool")) return "Multi-Agent Vector Memory & Tool Telemetry";
    return "Core AI Cognition Traversal & Action Plan";
  }, [activeSession]);

  // Handle cinematic 2.4s intro sequence when a session starts at 0
  useEffect(() => {
    if (activeSession && timelinePosition === 0) {
      setIntroActive(true);
      setIsPlaying(false);
      const timer = setTimeout(() => {
        setIntroActive(false);
        setIsPlaying(true);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [activeSession, timelinePosition]);

  // Handle ending panel trigger when playback completes
  useEffect(() => {
    if (timelinePosition >= 1.0 && !isPlaying && activeSession) {
      setEndingActive(true);
    } else {
      setEndingActive(false);
    }
  }, [timelinePosition, isPlaying, activeSession]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert("Security Limit Exceeded: Uploaded JSON file must be under 1.5MB to protect local browser memory.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        let loadedEvents = Array.isArray(data) ? data : data.events;

        if (Array.isArray(loadedEvents)) {
          if (loadedEvents.length > 300) {
            alert(`File Truncation Notice: Upload contains ${loadedEvents.length} events. Cap is 300 events to prevent canvas hangs. Truncating to first 300 events.`);
            loadedEvents = loadedEvents.slice(0, 300);
          }

          const isValid = loadedEvents.every((ev: unknown) => {
            const item = ev as Record<string, unknown>;
            return item && typeof item === "object" && "id" in item && "type" in item;
          });
          if (!isValid) {
            alert("Corrupt Schema: Loaded events do not match AetherEvent formatting (missing required 'id' or 'type' properties).");
            return;
          }

          loadReplay(loadedEvents);
          setTimeout(() => {
            useAetherStore.getState().computeGraph();
          }, 50);
        } else {
          alert("Invalid replay format: Could not find structured events array.");
        }
      } catch {
        alert("Parse Error: Failed to process JSON replay file.");
      }
    };
    reader.readAsText(file);
  };

  // Auto-compute graph when new events arrive
  useEffect(() => {
    computeGraph();
  }, [events.length, activeSession, computeGraph]);

  // Replay Animation Loop with Storytelling pacing based on node types
  useEffect(() => {
    if (!isPlaying) return;

    let timeoutId: NodeJS.Timeout;

    const runStep = () => {
      const state = useAetherStore.getState();
      const sEvents = state.events.filter(e => e.sessionId === (activeSession || "demo-session"));
      const eventsCount = sEvents.length;
      if (eventsCount === 0) return;

      const currentStep = Math.ceil(eventsCount * state.timelinePosition);
      const nextPos = Math.min(1, (currentStep + 1) / eventsCount);

      state.setTimelinePosition(nextPos);
      state.computeGraph();

      if (nextPos >= 1) {
        setIsPlaying(false);
        return;
      }

      // Rebuilt Storytelling pacing calculations
      const visible = sEvents.filter(e => e.type !== 'token');
      const nextCount = Math.ceil(visible.length * nextPos);
      const latestVisibleEvent = visible[nextCount - 1];

      let baseDelay = 1200; // Medium default pace
      if (latestVisibleEvent) {
        if (latestVisibleEvent.type === "hallucination") {
          baseDelay = 3800; // Slow, warning pause to let anomaly absorb
        } else if (latestVisibleEvent.metadata?.selfCorrection) {
          baseDelay = 2800; // Deliberate recovery cadence
        } else if (latestVisibleEvent.type === "tool_call" || latestVisibleEvent.type === "tool_result") {
          baseDelay = 750;  // Tool execution pipelines run slightly faster
        } else if (latestVisibleEvent.type === "memory") {
          baseDelay = 1600; // Memory retrieval has a gentle pause
        }
      }

      const delay = baseDelay / playbackSpeed;
      timeoutId = setTimeout(runStep, delay);
    };

    timeoutId = setTimeout(runStep, 1200 / playbackSpeed);

    return () => clearTimeout(timeoutId);
  }, [isPlaying, activeSession, playbackSpeed]);

  const sessionEvents = useMemo(
    () => events.filter((e) => e.sessionId === (activeSession || "demo-session")),
    [events, activeSession]
  );

  const visibleTicks = useMemo(() => {
    return sessionEvents.filter(e => e.type !== 'token');
  }, [sessionEvents]);

  const activeNodeId = useAetherStore((s) => s.activeNodeId);

  const activeNode = useMemo(() => {
    return nodes.find((n) => n.id === activeNodeId);
  }, [nodes, activeNodeId]);

  const latestEvent = useMemo(() => {
    const visible = sessionEvents.filter(e => e.type !== 'token');
    const count = Math.ceil(visible.length * timelinePosition);
    return visible[count - 1] || null;
  }, [sessionEvents, timelinePosition]);

  // Rebuilt Cinematic Soft Camera Follow focusing on active node and preserving contextual flow
  useEffect(() => {
    if (activeNode && isPlaying) {
      const isHallucination = latestEvent?.type === "hallucination";
      const isCorrection = latestEvent?.metadata?.selfCorrection;

      let targetZoom = 0.82; // Soft zoom to preserve parent thought & child branch relationships
      let followDuration = 1100;

      if (isHallucination) {
        targetZoom = 0.98; // Tighter warning focus to center on the anomaly
        followDuration = 1400; // Slower, dramatic pan
      } else if (isCorrection) {
        targetZoom = 0.86; // Stabilizing wider perspective
        followDuration = 1000;
      }

      setCenter(activeNode.position.x + 125, activeNode.position.y + 50, {
        zoom: targetZoom,
        duration: followDuration,
      });
    }
  }, [activeNode, isPlaying, latestEvent, setCenter]);

  const thoughtCount = sessionEvents.filter((e) => e.type === "thought").length;
  const toolCount = sessionEvents.filter(
    (e) => e.type === "tool_call"
  ).length;

  const narrationText = useMemo(() => {
    return latestEvent ? getNarrationForEvent(latestEvent) : null;
  }, [latestEvent]);

  return (
    <div className={cn(
      "w-full h-full relative overflow-hidden transition-all duration-700",
      latestEvent?.type === "hallucination" && "shadow-[inset_0_0_80px_rgba(244,63,94,0.18)]"
    )}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 1.1 }}
        minZoom={0.2}
        maxZoom={2}
        className={cn(
          "neural-grid transition-all duration-500",
          latestEvent?.type === "hallucination" && "bg-rose-950/5"
        )}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "aetherEdge",
        }}
      >
        <Background color="#0a0a14" gap={32} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-transparent !border-none !shadow-none"
        />

        {/* ── Top Left: Back Navigation and Session Info ── */}
        <Panel position="top-left" className="flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            {activeSession && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearEvents}
                className="glass-subtle p-2.5 rounded-xl hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition-all border border-white/5 flex items-center justify-center shadow-lg"
                title="Return to Home"
              >
                <Home size={14} />
              </motion.button>
            )}

            <div className="glass-elevated px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-lg">
              <div className="relative">
                <Activity
                  className={
                    isConnected
                      ? "text-cyan-400"
                      : "text-white/20"
                  }
                  size={16}
                />
                {isConnected && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-[0.15em] text-white/40">
                  Live Cognition Feed
                </p>
                <p className="text-xs font-mono text-white/80 mt-0.5">
                  {activeSession || "AWAITING AGENT..."}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Summary */}
          {sessionEvents.length > 0 && !introActive && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-2"
            >
              <div className="glass-subtle px-3 py-2 rounded-lg">
                <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold">
                  Thoughts
                </p>
                <p className="text-sm font-mono text-cyan-400 font-bold">
                  {thoughtCount}
                </p>
              </div>
              <div className="glass-subtle px-3 py-2 rounded-lg">
                <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold">
                  Tools
                </p>
                <p className="text-sm font-mono text-amber-400 font-bold">
                  {toolCount}
                </p>
              </div>
              <div className="glass-subtle px-3 py-2 rounded-lg">
                <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold">
                  Events
                </p>
                <p className="text-sm font-mono text-white/60 font-bold">
                  {Math.ceil(sessionEvents.length * timelinePosition)} / {sessionEvents.length}
                </p>
              </div>
            </motion.div>
          )}
        </Panel>

        {/* ── Top Right: Actions ── */}
        <Panel position="top-right" className="flex items-center gap-2">
          <input
            type="file"
            id="replay-upload"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById("replay-upload")?.click()}
            className="glass-subtle p-2.5 rounded-xl hover:bg-white/5 transition-all group"
            title="Load Replay File"
          >
            <Upload
              size={16}
              className="text-white/40 group-hover:text-cyan-400 transition-colors"
            />
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearEvents}
            className="glass-subtle p-2.5 rounded-xl hover:bg-white/5 transition-all group"
            title="Close Replay"
          >
            <X
              size={16}
              className="text-white/40 group-hover:text-rose-400 transition-colors"
            />
          </motion.button>
        </Panel>

        {/* ── Bottom: Timeline Scrubber ── */}
        {sessionEvents.length > 0 && !introActive && !endingActive && (
          <Panel position="bottom-center" className="w-full max-w-2xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-elevated rounded-xl px-4 py-3 shadow-xl border border-white/[0.04]"
            >
              <div className="flex items-center gap-3 mb-2 justify-center">
                <button
                  onClick={() => {
                    setTimelinePosition(0);
                    computeGraph();
                    setIsPlaying(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  title="Restart"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/20"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <button
                  onClick={() => {
                    setTimelinePosition(1);
                    computeGraph();
                    setIsPlaying(false);
                  }}
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  title="Jump to Latest"
                >
                  <SkipForward size={14} />
                </button>

                {/* Speed Multiplier Controls */}
                <div className="flex items-center gap-1 ml-4 border-l border-white/10 pl-4">
                  {[0.5, 1.0, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all border",
                        playbackSpeed === spd
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,255,0.15)]"
                          : "text-white/30 border-transparent hover:text-white/60 hover:bg-white/[0.02]"
                      )}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-cyan-400/80 uppercase w-16 text-left font-bold tracking-wider">
                  {Math.round(timelinePosition * 100)}%
                </span>

                {/* Custom Video Editor Scrubber Container */}
                <div className="flex-1 relative py-2 flex items-center">
                  {/* Event Ticks Layer */}
                  <div className="absolute left-1 right-1 h-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                    {visibleTicks.map((tick, idx) => {
                      const pct = visibleTicks.length > 1 ? (idx / (visibleTicks.length - 1)) * 100 : 0;
                      let tickColor = "bg-white/10";
                      if (tick.type === "thought") tickColor = "bg-cyan-500/60 shadow-[0_0_4px_#00f2ff]";
                      if (tick.type === "tool_call" || tick.type === "tool_result") tickColor = "bg-amber-500/60 shadow-[0_0_4px_#f59e0b]";
                      if (tick.type === "memory") tickColor = "bg-purple-500/60 shadow-[0_0_4px_#a855f7]";
                      if (tick.type === "hallucination") tickColor = "bg-rose-500 shadow-[0_0_8px_#f43f5e] h-4 z-20 animate-pulse";
                      if (tick.metadata?.selfCorrection) tickColor = "bg-emerald-500 shadow-[0_0_8px_#10b981] h-4 z-20";

                      return (
                        <div
                          key={tick.id}
                          className={cn("absolute w-0.5 h-2.5 rounded-full -translate-x-1/2 transition-all duration-300", tickColor)}
                          style={{ left: `${pct}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* HTML Range Scrubber input */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(timelinePosition * 100)}
                    onChange={(e) => {
                      const pos = parseInt(e.target.value) / 100;
                      setTimelinePosition(pos);
                      computeGraph();
                    }}
                    className="w-full h-1.5 appearance-none bg-white/5 rounded-full cursor-pointer z-10 relative
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cyan-400
                      [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(0,242,255,0.8)]
                      [&::-webkit-slider-thumb]:border
                      [&::-webkit-slider-thumb]:border-white/50
                      [&::-webkit-slider-thumb]:cursor-pointer
                      hover:[&::-webkit-slider-thumb]:scale-110
                      active:[&::-webkit-slider-thumb]:scale-120
                      transition-all"
                  />
                </div>

                <span className="text-[9px] font-mono text-white/30 w-20 text-right">
                  {Math.ceil(sessionEvents.length * timelinePosition)} /{" "}
                  {sessionEvents.length}
                </span>
              </div>
            </motion.div>
          </Panel>
        )}

        {/* ── Minimap ── */}
        <MiniMap
          className="!bg-[#020205]/95 !border !border-white/10 !rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,242,255,0.04)]"
          nodeColor={(node) => {
            const isSelected = node.id === activeNodeId;
            const isHallucination = node.data?.type === "hallucination";
            const isCorrection = node.data?.metadata?.selfCorrection;
            const onPath = useAetherStore.getState().activePathNodeIds.includes(node.id);

            if (isSelected) return isHallucination ? "#ef4444" : isCorrection ? "#10b981" : "#00f2ff";
            if (isHallucination) return "rgba(244, 63, 94, 0.9)"; // Red Hotspot!
            if (isCorrection) return "rgba(16, 185, 129, 0.7)";
            if (onPath) return "rgba(0, 242, 255, 0.4)";
            return "rgba(255, 255, 255, 0.08)";
          }}
          nodeStrokeWidth={1.5}
          nodeStrokeColor={(node) => {
            if (node.id === activeNodeId) return "#ffffff";
            return "transparent";
          }}
          maskColor="rgba(2, 2, 5, 0.75)"
          zoomable
          pannable
        />

        {/* ── Empty State Showcase (Home Page) ── */}
        {!activeSession && <ShowcaseLanding />}
      </ReactFlow>

      {/* ── Cinematic Narration & Reasoning Overlay ── */}
      {activeSession && narrationText && !introActive && !endingActive && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 max-w-xl w-[90%] bg-[rgba(8,8,16,0.9)] backdrop-blur-xl px-5 py-3 rounded-xl border border-cyan-500/20 text-center shadow-[0_0_35px_rgba(0,242,255,0.12)] z-20"
        >
          <div className="flex items-center gap-2 justify-center mb-1">
            <Brain size={12} className="text-cyan-400 animate-pulse" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400">
              Cognitive Traversal Narration
            </span>
          </div>
          <p className="text-xs text-white/95 font-medium leading-relaxed">
            <CaptionTypewriter text={narrationText} key={narrationText} />
          </p>
        </motion.div>
      )}

      {/* ── Hallucination Cinematic Intervention Banner ── */}
      {latestEvent?.type === "hallucination" && !endingActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 max-w-md w-[90%] bg-[rgba(244,63,94,0.15)] backdrop-blur-2xl border border-rose-500/40 rounded-xl px-5 py-4 text-center shadow-[0_0_50px_rgba(239,68,68,0.25)] z-30"
        >
          <div className="flex items-center gap-2.5 justify-center mb-1.5">
            <AlertTriangle className="text-rose-500 animate-[bounce_1s_infinite]" size={18} />
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.25em] text-rose-500">
              CRITICAL COGNITION RUPTURE
            </span>
          </div>
          <p className="text-xs text-white/90 font-semibold leading-relaxed">
            Guardrails successfully intercepted anomalous system command execution. Safe switch recovery activated.
          </p>
        </motion.div>
      )}

      {/* ── Cinematic Replay Intro Overlay ── */}
      <AnimatePresence>
        {activeSession && introActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020205]/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center max-w-lg px-6"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-cyan-500/15 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.15)]">
                  <Brain size={28} className="text-cyan-400 animate-pulse" />
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-cyan-400">
                Aether Telemetry Replay
              </span>

              <h2 className="text-2xl font-extrabold tracking-tight text-white mt-3 leading-snug">
                {sessionTitle}
              </h2>

              <p className="text-xs text-white/40 mt-3 leading-relaxed">
                Replaying live agent cognition, memory retrievals, and guardrail interceptions.
              </p>

              <div className="mt-8 flex items-center justify-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">
                  Initializing Replay Scrubber...
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cinematic Replay Ending Overlay ── */}
      <AnimatePresence>
        {activeSession && endingActive && !introActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020205]/90 backdrop-blur-xl z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md bg-[rgba(8,8,16,0.92)] border border-cyan-500/20 rounded-2xl p-7 text-center shadow-[0_0_60px_rgba(0,242,255,0.15)]"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>

              <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.25em] text-emerald-400">
                TRAVERSAL COMPLETE
              </span>

              <h3 className="text-xl font-bold text-white mt-2">
                Replay Completed Successfully
              </h3>

              <p className="text-xs text-white/40 mt-3 leading-relaxed px-2">
                All scheduled thoughts and external tool calls executed safely. Anomalous guardrail breaches corrected with 0 critical failures.
              </p>

              <div className="grid grid-cols-3 gap-3 my-6">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">Nodes</p>
                  <p className="text-base font-mono font-extrabold text-cyan-400 mt-1">{nodes.length}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">Security</p>
                  <p className="text-base font-mono font-extrabold text-emerald-400 mt-1">100%</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">Failures</p>
                  <p className="text-base font-mono font-extrabold text-rose-500 mt-1">0</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTimelinePosition(0);
                    computeGraph();
                    setIntroActive(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-xs border border-white/5 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} />
                  Replay Again
                </button>
                <button
                  onClick={clearEvents}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  <Home size={12} />
                  Back to Home
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Side Inspector ── */}
      <AgentInspector />
    </div>
  );
};

// ─── Exported with Provider ─────────────────────────────────────────────────

export const Observatory = () => {
  return (
    <ReactFlowProvider>
      <ObservatoryInner />
    </ReactFlowProvider>
  );
};
