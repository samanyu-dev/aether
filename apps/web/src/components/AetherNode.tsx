"use client";
import React, { memo, useState, useMemo } from "react";
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

  // Comparison/Diff context
  const diff = data.diff;
  const diffStatus = diff?.status;

  // Active path calculation: fetched directly from pre-computed store state!
  const activeNodeId = useAetherStore((s) => s.activeNodeId);
  const isOnActivePath = useAetherStore((s) => s.activePathNodeIds.includes(data.id));

  const isActive = data.id === activeNodeId;

  // Dynamic Node Sizing & Widths for compact overlap-free hierarchy
  const nodeStyles = useMemo(() => {
    const isRoot = !data.parentId;
    if (isRoot) return { minWidth: "210px", scale: 1.02, shadow: "shadow-[0_0_35px_rgba(0,242,255,0.18)] border-cyan-500/50" };
    if (data.type === "hallucination") return { minWidth: "195px", scale: 1.0, shadow: "shadow-[0_0_30px_rgba(244,63,94,0.2)] border-rose-500/50" };
    if (data.type === "tool_call" || data.type === "tool_result") return { minWidth: "180px", scale: 0.96, shadow: "shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/30" };
    if (data.type === "memory") return { minWidth: "180px", scale: 0.96, shadow: "shadow-[0_0_15px_rgba(168,85,247,0.15)] border-purple-500/30" };
    if (data.type === "token") return { minWidth: "140px", scale: 0.9, shadow: "shadow-sm border-slate-500/20" };
    if (data.type === "system") return { minWidth: "130px", scale: 0.86, shadow: "shadow-none border-slate-500/10" };
    return { minWidth: "180px", scale: 0.96, shadow: "border-white/10" };
  }, [data.parentId, data.type]);

  return (
    <motion.div
      initial={{ scale: 0.82, opacity: 0, filter: "blur(4px)" }}
      animate={{ 
        scale: isActive ? nodeStyles.scale * 1.05 : nodeStyles.scale,
        opacity: diffStatus === "deleted" ? 0.35 : 1, 
        filter: "blur(0px)" 
      }}
      transition={{
        duration: 0.45,
        delay: 0.22, // Delays node card materialization so the elegant edge pulse sweeps first
        ease: [0.16, 1, 0.3, 1], // Apple-like custom easeOut
      }}
      style={{ minWidth: nodeStyles.minWidth }}
      className={cn(
        "relative group cursor-pointer select-none max-w-[240px] transition-opacity transition-transform duration-500",
        !isOnActivePath && diffStatus !== "deleted" && "opacity-25 blur-[0.4px] saturate-60 pointer-events-none hover:opacity-40",
        diffStatus === "deleted" && "cursor-not-allowed pointer-events-none"
      )}
      onClick={() => {
        if (diffStatus === "deleted") return;
        useAetherStore.getState().setSelectedEvent(data.id);
        if (data.metadata && Object.keys(data.metadata).filter(k => !["agentName", "sessionName", "confidence", "selfCorrection"].includes(k)).length > 0) {
          setExpanded(!expanded);
        }
      }}
    >
      {/* Animated Wave Glow backdrop */}
      {isOnActivePath && diffStatus !== "deleted" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0] }}
          transition={{ 
            duration: 1.4, 
            delay: 0.15, 
            times: [0, 0.12, 1],
            ease: "easeOut"
          }}
          className={cn(
            "absolute -inset-2 rounded-2xl blur-xl",
            isHallucination ? "bg-rose-500/60" : "bg-cyan-500/40"
          )}
        />
      )}
      
      {/* Hover glow */}
      {isOnActivePath && diffStatus !== "deleted" && (
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
            isHallucination ? "bg-rose-500/30" : "bg-cyan-500/30"
          )}
        />
      )}

      {/* Hallucination Heatmap Visual Loops / Breathing Halo */}
      {confidence !== null && confidence < 0.6 && confidence >= 0.45 && diffStatus !== "deleted" && (
        <motion.div
          animate={{
            scale: [0.95, 1.05, 0.95],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-amber-500/25 to-orange-500/25 blur-lg pointer-events-none z-[-1]"
        />
      )}

      {/* Hallucination Crimson Hot-loop animation */}
      {confidence !== null && confidence < 0.45 && diffStatus !== "deleted" && (
        <>
          <motion.div
            animate={{
              scale: [0.95, 1.08, 0.95],
              opacity: [0.4, 0.75, 0.4],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -inset-4 rounded-2xl bg-gradient-to-tr from-rose-500/35 via-red-600/15 to-orange-500/35 blur-xl pointer-events-none z-[-1]"
          />
          <svg className="absolute -inset-[6px] w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none z-[-1]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect
              x="1.5"
              y="1.5"
              width="calc(100% - 3px)"
              height="calc(100% - 3px)"
              rx="14"
              stroke="url(#crimson-hot-loop-gradient)"
              strokeWidth="2.5"
              style={{
                strokeDasharray: "40 120",
                animation: "spin-loop 3.5s linear infinite",
              }}
            />
            <defs>
              <linearGradient id="crimson-hot-loop-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>
          </svg>
          <style>{`
            @keyframes spin-loop {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 160; }
            }
          `}</style>
        </>
      )}

      {/* Main card */}
      <div
        className={cn(
          "relative rounded-xl border overflow-hidden transition-all duration-300",
          "bg-[rgba(8,8,16,0.85)] backdrop-blur-xl",
          config.borderColor,
          config.bgGlow,
          nodeStyles.shadow,
          isHallucination && "animate-pulse-subtle shadow-[0_0_40px_rgba(244,63,94,0.25)]",
          data.type === "tool_call" && "animate-pulse-subtle shadow-[0_0_20px_rgba(245,158,11,0.15)]",
          diffStatus === "deleted" && "border-dashed border-rose-500/40 bg-rose-950/5 shadow-none",
          isActive && (
            isHallucination 
              ? "border-rose-400 shadow-[0_0_45px_rgba(244,63,94,0.35)]" 
              : isSelfCorrection 
              ? "border-emerald-400 shadow-[0_0_45px_rgba(16,185,129,0.35)]" 
              : "border-cyan-400 shadow-[0_0_45px_rgba(0,242,255,0.35)]"
          )
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

        {/* Delayed Content Birth Sequence */}
        <motion.div 
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.38 }}
          className="px-4 py-3"
        >
          {/* Header row */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                "p-1.5 rounded-lg flex items-center justify-center",
                config.iconBg
              )}
            >
              <Icon size={14} className={config.color} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.15em] leading-none",
                    config.color,
                    "opacity-85"
                  )}
                >
                  {toolName || config.label}
                </span>

                {/* Diff badges */}
                {diffStatus === 'added' && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 leading-none">
                    🆕 Added
                  </span>
                )}
                {diffStatus === 'modified' && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 leading-none">
                    ⚡ Modified
                  </span>
                )}
                {diffStatus === 'deleted' && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 border-dashed leading-none">
                    ❌ Removed
                  </span>
                )}

                {confidence !== null && (
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "text-[8px] font-mono px-1.5 py-0.5 rounded-full leading-none",
                        confidence > 0.9
                          ? "bg-emerald-500/10 text-emerald-400"
                          : confidence > 0.7
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      )}
                    >
                      {Math.round(confidence * 100)}%
                    </span>
                    {diff?.confidenceDelta !== undefined && diff.confidenceDelta !== 0 && (
                      <span className={cn(
                        "text-[8px] font-mono font-bold px-1 rounded-sm leading-none",
                        diff.confidenceDelta > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                      )}>
                        {diff.confidenceDelta > 0 ? `↗ +${Math.round(diff.confidenceDelta * 100)}%` : `↘ ${Math.round(diff.confidenceDelta * 100)}%`}
                      </span>
                    )}
                  </div>
                )}

                {isSelfCorrection && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 leading-none">
                    REVISED
                  </span>
                )}
              </div>
            </div>

            {latency !== undefined && (
              <div className="flex items-center gap-1 text-[9px] font-mono text-white/30 shrink-0">
                <Clock size={9} />
                <span>{latency}ms</span>
                {diff?.latencyDelta !== undefined && diff.latencyDelta !== 0 && (
                  <span className={cn(
                    "text-[8px] font-bold px-1 rounded-sm leading-none",
                    diff.latencyDelta < 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                  )}>
                    {diff.latencyDelta < 0 ? `${diff.latencyDelta}ms` : `+${diff.latencyDelta}ms`}
                  </span>
                )}
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
            {diffStatus === 'deleted' ? (
              <span>{data.label}</span>
            ) : (
              <TypewriterText text={data.label} />
            )}
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
        </motion.div>

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
