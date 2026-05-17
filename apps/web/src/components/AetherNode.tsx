"use client";
import React, { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideProps } from "lucide-react";
import {
  Brain,
  Wrench,
  Database,
  MessageSquare,
  AlertTriangle,
  Cpu,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAetherStore, AetherEvent } from "@/store/useAetherStore";

// ─── Config ─────────────────────────────────────────────────────────────────

type LucideIcon = React.FC<LucideProps>;

const nodeConfig: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    color: string;
    borderColor: string;
    bgGlow: string;
    iconBg: string;
  }
> = {
  thought: {
    icon: Brain,
    label: "THOUGHT",
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    bgGlow: "shadow-[0_0_30px_rgba(0,242,255,0.08)]",
    iconBg: "bg-cyan-500/10",
  },
  tool_call: {
    icon: Wrench,
    label: "TOOL CALL",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgGlow: "shadow-[0_0_30px_rgba(245,158,11,0.08)]",
    iconBg: "bg-amber-500/10",
  },
  tool_result: {
    icon: Zap,
    label: "RESULT",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgGlow: "shadow-[0_0_30px_rgba(16,185,129,0.08)]",
    iconBg: "bg-emerald-500/10",
  },
  memory: {
    icon: Database,
    label: "MEMORY",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgGlow: "shadow-[0_0_30px_rgba(168,85,247,0.08)]",
    iconBg: "bg-purple-500/10",
  },
  token: {
    icon: MessageSquare,
    label: "TOKEN",
    color: "text-slate-400",
    borderColor: "border-slate-500/20",
    bgGlow: "",
    iconBg: "bg-slate-500/10",
  },
  hallucination: {
    icon: AlertTriangle,
    label: "⚠ HALLUCINATION",
    color: "text-rose-400",
    borderColor: "border-rose-500/40",
    bgGlow: "shadow-[0_0_40px_rgba(239,68,68,0.12)]",
    iconBg: "bg-rose-500/15",
  },
  agent_message: {
    icon: Cpu,
    label: "AGENT MSG",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgGlow: "shadow-[0_0_30px_rgba(59,130,246,0.08)]",
    iconBg: "bg-blue-500/10",
  },
  system: {
    icon: Cpu,
    label: "SYSTEM",
    color: "text-slate-500",
    borderColor: "border-slate-500/20",
    bgGlow: "",
    iconBg: "bg-slate-500/10",
  },
};

const defaultConfig = nodeConfig.thought;

import { useEffect } from "react";

const TypewriterText = ({ text, speed = 18 }: { text: string; speed?: number }) => {
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

interface AetherNodeData extends AetherEvent {
  label: string;
  animationIndex: number;
}

const AetherNode = ({ data }: { data: AetherNodeData }) => {
  const [expanded, setExpanded] = useState(false);
  const config = nodeConfig[data.type] || defaultConfig;
  const Icon = config.icon;

  const confidence = typeof data.metadata?.confidence === "number" ? data.metadata.confidence : null;
  const latency = data.metadata?.latency;
  const toolName = data.metadata?.toolName;
  const isHallucination = data.type === "hallucination";
  const isSelfCorrection = data.metadata?.selfCorrection;

  // Active path calculation: walk up the parents of the active node!
  const { activeNodeId, isOnActivePath } = useAetherStore((s) => {
    const visibleEvents = s.events.filter(e => e.type !== 'token');
    const count = Math.ceil(visibleEvents.length * s.timelinePosition);
    const activeId = visibleEvents[count - 1]?.id;

    const path = new Set<string>();
    let currentId: string | undefined = activeId;
    while (currentId) {
      path.add(currentId);
      const parentEvent = visibleEvents.find(e => e.id === currentId);
      currentId = parentEvent?.parentId;
    }
    return { activeNodeId: activeId, isOnActivePath: path.has(data.id) };
  });

  const isActive = data.id === activeNodeId;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, filter: "blur(8px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.65,
        delay: 0.35, // Delays node card materialization so the edge sweep plays first!
        ease: "easeOut",
      }}
      className={cn(
        "relative group cursor-pointer select-none",
        "min-w-[220px] max-w-[320px]",
        !isOnActivePath && "opacity-20 blur-[0.5px] saturate-50 pointer-events-none hover:opacity-40 transition-all duration-500"
      )}
      onClick={() => {
        useAetherStore.getState().setSelectedEvent(data.id);
        if (data.metadata && Object.keys(data.metadata).filter(k => !["agentName", "sessionName", "confidence", "selfCorrection"].includes(k)).length > 0) {
          setExpanded(!expanded);
        }
      }}
    >
      {/* Animated Wave Glow backdrop */}
      {isOnActivePath && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ 
            duration: 1.5, 
            delay: 0.2, 
            times: [0, 0.1, 1],
            ease: "easeOut"
          }}
          className={cn(
            "absolute -inset-2 rounded-2xl blur-xl",
            isHallucination ? "bg-rose-500/60" : "bg-cyan-500/40"
          )}
        />
      )}
      
      {/* Hover glow */}
      {isOnActivePath && (
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
            isHallucination ? "bg-rose-500/30" : "bg-cyan-500/30"
          )}
        />
      )}

      {/* Main card */}
      <div
        className={cn(
          "relative rounded-xl border overflow-hidden transition-all duration-300",
          "bg-[rgba(8,8,16,0.85)] backdrop-blur-xl",
          config.borderColor,
          config.bgGlow,
          isHallucination && "animate-pulse-subtle border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.25)]",
          !data.parentId && "scale-[1.02] shadow-[0_0_40px_rgba(0,242,255,0.15)] border-cyan-500/50",
          data.type === "tool_call" && "animate-pulse-subtle border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
          data.type === "memory" && "border-purple-500/50",
          isActive && "border-cyan-400 shadow-[0_0_35px_rgba(0,242,255,0.2)]"
        )}
      >
        {/* Handle target (Left edge) */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !bg-cyan-400/40 !border-cyan-400/20 !-left-1"
        />

        {/* Top accent line */}
        <div
          className={cn(
            "h-[2px] w-full",
            isHallucination
              ? "bg-gradient-to-r from-transparent via-rose-500 to-transparent"
              : isSelfCorrection
              ? "bg-gradient-to-r from-transparent via-amber-500 to-transparent"
              : "bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
          )}
        />

        <div className="px-4 py-3">
          {/* Header row */}
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className={cn(
                "p-1.5 rounded-lg flex items-center justify-center",
                config.iconBg
              )}
            >
              <Icon size={14} className={config.color} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.15em] leading-none",
                    config.color,
                    "opacity-85"
                  )}
                >
                  {toolName || config.label}
                </span>

                {confidence !== null && (
                  <span
                    className={cn(
                      "text-[8px] font-mono px-1.5 py-0.5 rounded-full",
                      confidence > 0.9
                        ? "bg-emerald-500/10 text-emerald-400"
                        : confidence > 0.7
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-rose-500/10 text-rose-400"
                    )}
                  >
                    {Math.round(confidence * 100)}%
                  </span>
                )}

                {isSelfCorrection && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                    REVISED
                  </span>
                )}
              </div>
            </div>

            {latency !== undefined && (
              <div className="flex items-center gap-1 text-[9px] font-mono text-white/30">
                <Clock size={9} />
                <span>{latency}ms</span>
              </div>
            )}
          </div>

          {/* Content */}
          <p
            className={cn(
              "text-[12px] leading-relaxed text-white/80 font-medium",
              !expanded && "line-clamp-2"
            )}
          >
            <TypewriterText text={data.label} />
          </p>

          {/* Expandable metadata */}
          <AnimatePresence>
            {expanded && data.metadata && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 pt-2 border-t border-white/5 overflow-hidden"
              >
                <div className="space-y-1">
                  {Object.entries(data.metadata)
                    .filter(
                      ([k]) =>
                        !["agentName", "sessionName", "confidence", "selfCorrection"].includes(k)
                    )
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start gap-2 text-[10px]"
                      >
                        <span className="text-white/30 font-mono uppercase shrink-0">
                          {key}:
                        </span>
                        <span className="text-white/60 font-mono break-all">
                          {typeof value === "object"
                            ? JSON.stringify(value).slice(0, 80)
                            : String(value).slice(0, 80)}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand indicator */}
          {data.metadata &&
            Object.keys(data.metadata).filter(
              (k) => !["agentName", "sessionName", "confidence", "selfCorrection"].includes(k)
            ).length > 0 && (
              <div className="flex justify-center mt-1.5 -mb-1">
                {expanded ? (
                  <ChevronUp size={12} className="text-white/20" />
                ) : (
                  <ChevronDown size={12} className="text-white/20" />
                )}
              </div>
            )}
        </div>

        {/* Handle source (Right edge) */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !bg-cyan-400/45 !border-cyan-400/20 !-right-1"
        />
      </div>
    </motion.div>
  );
};

export default memo(AetherNode);
