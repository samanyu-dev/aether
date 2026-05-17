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
import { motion } from "framer-motion";
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
  const { setCenter } = useReactFlow();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const loadedEvents = Array.isArray(data) ? data : data.events;
        if (Array.isArray(loadedEvents)) {
          loadReplay(loadedEvents);
          setTimeout(() => {
            useAetherStore.getState().computeGraph();
          }, 50);
        } else {
          alert("Invalid replay format. Could not find events array.");
        }
      } catch {
        alert("Failed to parse JSON replay file.");
      }
    };
    reader.readAsText(file);
  };

  // Auto-compute graph when new events arrive
  useEffect(() => {
    computeGraph();
  }, [events.length, activeSession, computeGraph]);

  // Replay Animation Loop with Variable Pacing & pauses
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

      // Check for hallucination to dramatically slow down pacing
      const visible = sEvents.filter(e => e.type !== 'token');
      const nextCount = Math.ceil(visible.length * nextPos);
      const latestVisibleEvent = visible[nextCount - 1];
      const delay = latestVisibleEvent?.type === "hallucination" ? 3000 : 1400;

      timeoutId = setTimeout(runStep, delay);
    };

    timeoutId = setTimeout(runStep, 1400);

    return () => clearTimeout(timeoutId);
  }, [isPlaying, activeSession]);

  // Soft camera follow choreography
  const latestNode = nodes[nodes.length - 1];
  useEffect(() => {
    if (latestNode && isPlaying) {
      setCenter(latestNode.position.x + 125, latestNode.position.y + 50, {
        zoom: 0.95,
        duration: 900,
      });
    }
  }, [latestNode, isPlaying, setCenter]);

  const sessionEvents = useMemo(
    () => events.filter((e) => e.sessionId === (activeSession || "demo-session")),
    [events, activeSession]
  );

  const thoughtCount = sessionEvents.filter((e) => e.type === "thought").length;
  const toolCount = sessionEvents.filter(
    (e) => e.type === "tool_call"
  ).length;

  const latestEvent = useMemo(() => {
    const visible = sessionEvents.filter(e => e.type !== 'token');
    const count = Math.ceil(visible.length * timelinePosition);
    return visible[count - 1] || null;
  }, [sessionEvents, timelinePosition]);

  const narrationText = useMemo(() => {
    return latestEvent ? getNarrationForEvent(latestEvent) : null;
  }, [latestEvent]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={2}
        className="neural-grid"
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

        {/* ── Top Left: Session Info ── */}
        <Panel position="top-left" className="flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-elevated px-4 py-3 rounded-xl flex items-center gap-3"
          >
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
          </motion.div>

          {/* Stats */}
          {sessionEvents.length > 0 && (
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
                  {sessionEvents.length}
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
            title="Reset"
          >
            <RotateCcw
              size={16}
              className="text-white/40 group-hover:text-rose-400 transition-colors"
            />
          </motion.button>
        </Panel>

        {/* ── Bottom: Timeline Scrubber ── */}
        {sessionEvents.length > 0 && (
          <Panel position="bottom-center" className="w-full max-w-2xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-elevated rounded-xl px-4 py-3"
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
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-white/30 uppercase w-16">
                  {Math.round(timelinePosition * 100)}%
                </span>
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
                  className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-cyan-400
                    [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,242,255,0.5)]
                    [&::-webkit-slider-thumb]:cursor-pointer"
                />
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
          className="!bg-[#020205] !border !border-white/10 !rounded-xl overflow-hidden" 
          nodeColor="#00f2ff" 
          maskColor="rgba(0,0,0,0.5)"
          zoomable
          pannable
        />

        {/* ── Empty State Showcase (Tasks 3, 4, 5, 6) ── */}
        {!activeSession && <ShowcaseLanding />}
      </ReactFlow>

      {/* ── Cinematic Narration & Reasoning Overlay ── */}
      {activeSession && narrationText && (
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
      {latestEvent?.type === "hallucination" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 max-w-md w-[90%] bg-[rgba(244,63,94,0.12)] backdrop-blur-2xl border border-rose-500/30 rounded-xl px-5 py-4 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)] z-30"
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
