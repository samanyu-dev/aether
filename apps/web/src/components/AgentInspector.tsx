'use client';
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAetherStore } from '@/store/useAetherStore';
import { 
  X, 
  Clock, 
  Zap, 
  Database, 
  Brain, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  GitBranch,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const AgentInspector = () => {
  const selectedEventId = useAetherStore((s) => s.selectedEventId);
  const events = useAetherStore((s) => s.events);
  const setSelectedEvent = useAetherStore((s) => s.setSelectedEvent);

  const event = events.find((e) => e.id === selectedEventId);

  // Compute total timeline steps based on visible events
  const visibleEvents = useMemo(() => {
    return events.filter(e => e.type !== 'token');
  }, [events]);

  const activeIndex = useMemo(() => {
    if (!event) return -1;
    return visibleEvents.findIndex(e => e.id === event.id);
  }, [event, visibleEvents]);

  // Reasoning narrative generator for the selected node
  const reasoningSummary = useMemo(() => {
    if (!event) return '';
    const type = event.type;
    const isSelfCorrection = event.metadata?.selfCorrection;
    const toolName = event.metadata?.toolName;

    if (isSelfCorrection) {
      return "Cognitive Healing branch successfully activated. Aether safe-workspace guardrails successfully resolved the anomalous command, routing the workflow to secure infrastructure.";
    }
    if (type === 'hallucination') {
      return "CRITICAL HEURISTIC BREACH: Agent reasoning generated a dangerous or unstable action payload. Safety guardrails intervened, freezing the active branch to prevent compromise.";
    }
    if (type === 'thought') {
      return "Agent primary cognitive logic loop. The AI is analyzing the telemetry context and computing optimal traversal steps.";
    }
    if (type === 'tool_call') {
      return `Telemetry captured an external environment request. Calling tool \`${toolName || 'shell_exec'}\` to perform sandbox commands.`;
    }
    if (type === 'tool_result') {
      return "Sandbox state return callback. Received telemetry payload from the execution environment.";
    }
    if (type === 'memory') {
      return "Semantic context search. Retrieved vector embeddings of historical commands and codebase memories.";
    }
    return "Standard cognitive node tracking trace execution and active agent observation metrics.";
  }, [event]);

  // Traversal targets
  const prevNode = useMemo(() => {
    if (activeIndex <= 0) return null;
    return visibleEvents[activeIndex - 1];
  }, [activeIndex, visibleEvents]);

  const nextNode = useMemo(() => {
    if (activeIndex === -1 || activeIndex >= visibleEvents.length - 1) return null;
    return visibleEvents[activeIndex + 1];
  }, [activeIndex, visibleEvents]);

  // Locate the self-correction branch sister node if present
  const correctionNode = useMemo(() => {
    if (!event) return null;
    return events.find(e => 
      e.parentId === event.parentId && 
      e.id !== event.id && 
      (e.metadata?.selfCorrection || e.type !== 'hallucination')
    );
  }, [event, events]);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-14 bottom-0 w-80 bg-[rgba(8,8,16,0.92)] backdrop-blur-2xl border-l border-white/10 shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Cognition Analysis</h2>
              {activeIndex !== -1 && (
                <p className="text-[9px] font-mono text-cyan-400/80 mt-1 uppercase tracking-wider">
                  Replay Step {activeIndex + 1} / {visibleEvents.length}
                </p>
              )}
            </div>
            <button 
              onClick={() => setSelectedEvent(null)}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
            
            {/* Traversal Navigation Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!prevNode}
                onClick={() => setSelectedEvent(prevNode!.id)}
                className="glass-subtle py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px] text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all"
              >
                <ArrowLeft size={10} />
                Prev Step
              </button>
              <button
                disabled={!nextNode}
                onClick={() => setSelectedEvent(nextNode!.id)}
                className="glass-subtle py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px] text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all"
              >
                Next Step
                <ArrowRight size={10} />
              </button>
            </div>

            {/* Sibling Splicing (Self-Correction Branch Navigation) */}
            {correctionNode && (
              <button
                onClick={() => setSelectedEvent(correctionNode.id)}
                className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 transition-all font-bold"
              >
                <GitBranch size={11} />
                Jump to Correction Path
              </button>
            )}

            {/* Type & Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md",
                  event.type === 'thought' ? "bg-cyan-500/20 text-cyan-400" :
                  event.type === 'tool_call' ? "bg-orange-500/20 text-orange-400" :
                  event.type === 'tool_result' ? "bg-green-500/20 text-green-400" :
                  event.type === 'memory' ? "bg-purple-500/20 text-purple-400" :
                  "bg-rose-500/20 text-rose-400"
                )}>
                  {event.type === 'thought' ? <Brain size={14} /> :
                   event.type === 'tool_call' ? <Zap size={14} /> :
                   event.type === 'memory' ? <Database size={14} /> :
                   <AlertTriangle size={14} />}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  {event.type.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-mono">
                <Clock size={10} />
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Dynamic Heuristic summary */}
            <div className="space-y-1.5">
              <h3 className="text-[9px] font-bold uppercase text-white/40 tracking-widest flex items-center gap-1">
                <ShieldAlert size={10} className="text-cyan-400" />
                Reasoning Summary
              </h3>
              <p className="text-[11px] leading-relaxed text-white/70 bg-white/[0.02] border border-white/5 rounded-lg p-3">
                {reasoningSummary}
              </p>
            </div>

            {/* Content Payload */}
            <div className="space-y-2">
              <h3 className="text-[9px] font-bold uppercase text-white/40 tracking-widest">Content payload</h3>
              <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-[11px] text-white/80 font-mono leading-relaxed max-h-56 overflow-y-auto custom-scrollbar">
                {typeof event.content === 'string' ? event.content : JSON.stringify(event.content, null, 2)}
              </div>
            </div>

            {/* Metadata properties */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[9px] font-bold uppercase text-white/40 tracking-widest">Properties</h3>
                <div className="space-y-1">
                  {Object.entries(event.metadata).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-[11px] text-white/50 font-mono">{key}</span>
                      <span className="text-[11px] text-cyan-400 font-mono">
                        {typeof val === 'object' ? 'Object' : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
