"use client";
import React, { useMemo, useRef } from "react";
import { useAetherStore, AetherEvent } from "@/store/useAetherStore";
import { motion } from "framer-motion";
import type { LucideProps } from "lucide-react";
import {
  Brain,
  Wrench,
  Zap,
  Database,
  AlertTriangle,
  Cpu,
  MessageSquare,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Type Config ────────────────────────────────────────────────────────────

type LucideIcon = React.FC<LucideProps>;

const typeStyles: Record<
  string,
  { icon: LucideIcon; color: string; dotColor: string; lineColor: string }
> = {
  thought: {
    icon: Brain,
    color: "text-cyan-400",
    dotColor: "bg-cyan-400",
    lineColor: "from-cyan-400/30",
  },
  tool_call: {
    icon: Wrench,
    color: "text-amber-400",
    dotColor: "bg-amber-400",
    lineColor: "from-amber-400/30",
  },
  tool_result: {
    icon: Zap,
    color: "text-emerald-400",
    dotColor: "bg-emerald-400",
    lineColor: "from-emerald-400/30",
  },
  memory: {
    icon: Database,
    color: "text-purple-400",
    dotColor: "bg-purple-400",
    lineColor: "from-purple-400/30",
  },
  hallucination: {
    icon: AlertTriangle,
    color: "text-rose-400",
    dotColor: "bg-rose-400",
    lineColor: "from-rose-400/30",
  },
  agent_message: {
    icon: Cpu,
    color: "text-blue-400",
    dotColor: "bg-blue-400",
    lineColor: "from-blue-400/30",
  },
  system: {
    icon: Cpu,
    color: "text-slate-500",
    dotColor: "bg-slate-500",
    lineColor: "from-slate-500/30",
  },
  token: {
    icon: MessageSquare,
    color: "text-slate-600",
    dotColor: "bg-slate-600",
    lineColor: "from-slate-600/20",
  },
};

const defaultStyle = typeStyles.thought;

// ─── Timeline Event ─────────────────────────────────────────────────────────

const TimelineEvent = ({
  event,
  index,
  total,
  relativeMs,
}: {
  event: AetherEvent;
  index: number;
  total: number;
  relativeMs: number;
}) => {
  const style = typeStyles[event.type] || defaultStyle;
  const Icon = style.icon;
  const setSelectedEvent = useAetherStore((s) => s.setSelectedEvent);
  const selectedEventId = useAetherStore((s) => s.selectedEventId);
  const isSelected = selectedEventId === event.id;

  const content =
    typeof event.content === "string"
      ? event.content
      : JSON.stringify(event.content).slice(0, 100);

  const timeStr = relativeMs < 1000
    ? `+${relativeMs}ms`
    : `+${(relativeMs / 1000).toFixed(1)}s`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.4 }}
      onClick={() => setSelectedEvent(isSelected ? null : event.id)}
      className={cn(
        "relative flex gap-4 pb-6 cursor-pointer group",
        isSelected && "bg-white/[0.02] -mx-4 px-4 rounded-lg"
      )}
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0 w-8">
        {/* Dot */}
        <div className="relative z-10">
          <div
            className={cn(
              "w-3 h-3 rounded-full border-2 border-[#020205] transition-all duration-300",
              style.dotColor,
              isSelected && "ring-2 ring-offset-1 ring-offset-[#020205]",
              isSelected && event.type === "thought" && "ring-cyan-400/30",
              isSelected && event.type === "hallucination" && "ring-rose-400/30"
            )}
          />
          {isSelected && (
            <div
              className={cn(
                "absolute -inset-1 rounded-full animate-ping opacity-30",
                style.dotColor
              )}
            />
          )}
        </div>
        {/* Connector line */}
        {index < total - 1 && (
          <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Icon size={12} className={cn(style.color, "opacity-70")} />
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-[0.1em]",
                style.color,
                "opacity-60"
              )}
            >
              {event.metadata?.toolName || event.type.replace("_", " ")}
            </span>
          </div>
          <span className="text-[9px] font-mono text-white/15">
            {timeStr}
          </span>
        </div>

        <p className="text-[11px] text-white/60 leading-relaxed line-clamp-2 group-hover:text-white/75 transition-colors">
          {content}
        </p>

        {/* Metadata chips */}
        {(event.metadata?.confidence || event.metadata?.latency) && (
          <div className="flex items-center gap-2 mt-1.5">
            {typeof event.metadata?.confidence === "number" && (
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-white/25">
                Confidence: {Math.round(event.metadata.confidence * 100)}%
              </span>
            )}
            {event.metadata?.latency && (
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-white/25">
                {event.metadata.latency}ms
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Timeline View ─────────────────────────────────────────────────────

export const TimelineView = () => {
  const events = useAetherStore((s) => s.events);
  const activeSession = useAetherStore((s) => s.activeSession);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionEvents = useMemo(() => {
    return events
      .filter((e) => e.sessionId === (activeSession || "demo-session"))
      .filter((e) => e.type !== "token");
  }, [events, activeSession]);

  const firstTimestamp = useMemo(() => {
    if (sessionEvents.length === 0) return 0;
    try {
      return new Date(sessionEvents[0].timestamp).getTime();
    } catch {
      return 0;
    }
  }, [sessionEvents]);

  if (sessionEvents.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-[#020205] flex items-center justify-center">
            <Clock size={24} className="text-white/20" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-white/40">
          No Events Yet
        </h3>
        <p className="text-xs text-white/20 mt-1">
          Run the demo agent to see the timeline
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-cyan-400" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
            Cognition Timeline
          </h2>
        </div>
        <span className="text-[9px] font-mono text-white/20">
          {sessionEvents.length} events
        </span>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {sessionEvents.map((event, idx) => {
          let relativeMs = 0;
          try {
            relativeMs = Math.max(
              0,
              new Date(event.timestamp).getTime() - firstTimestamp
            );
          } catch {
            /* noop */
          }
          return (
            <TimelineEvent
              key={event.id}
              event={event}
              index={idx}
              total={sessionEvents.length}
              relativeMs={relativeMs}
            />
          );
        })}
      </div>
    </div>
  );
};
