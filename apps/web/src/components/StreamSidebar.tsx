"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { useAetherStore, AetherEvent } from "@/store/useAetherStore";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideProps } from "lucide-react";
import {
  Terminal,
  Cpu,
  Database,
  Brain,
  Wrench,
  AlertTriangle,
  Zap,
  MessageSquare,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Event Type Config ──────────────────────────────────────────────────────

type LucideIcon = React.FC<LucideProps>;

const typeConfig: Record<
  string,
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
  thought: {
    icon: Brain,
    color: "text-cyan-400",
    bg: "bg-cyan-500/8",
    border: "border-l-cyan-500/40",
  },
  tool_call: {
    icon: Wrench,
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-l-amber-500/40",
  },
  tool_result: {
    icon: Zap,
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-l-emerald-500/40",
  },
  memory: {
    icon: Database,
    color: "text-purple-400",
    bg: "bg-purple-500/8",
    border: "border-l-purple-500/40",
  },
  token: {
    icon: MessageSquare,
    color: "text-slate-500",
    bg: "bg-slate-500/5",
    border: "border-l-slate-500/20",
  },
  hallucination: {
    icon: AlertTriangle,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-l-rose-500/50",
  },
  agent_message: {
    icon: Cpu,
    color: "text-blue-400",
    bg: "bg-blue-500/8",
    border: "border-l-blue-500/40",
  },
  system: {
    icon: Cpu,
    color: "text-slate-500",
    bg: "bg-slate-500/5",
    border: "border-l-slate-500/20",
  },
};

const defaultTypeConfig = typeConfig.thought;

// ─── Event Card ─────────────────────────────────────────────────────────────

const EventCard = ({
  event,
  index,
}: {
  event: AetherEvent;
  index: number;
}) => {
  const config = typeConfig[event.type] || defaultTypeConfig;
  const Icon = config.icon;
  const isToken = event.type === "token";
  const setSelectedEvent = useAetherStore((s) => s.setSelectedEvent);
  const selectedEventId = useAetherStore((s) => s.selectedEventId);
  const isSelected = selectedEventId === event.id;

  const activeNodeId = useAetherStore((s) => s.activeNodeId);
  const isActive = event.id === activeNodeId;

  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive]);

  // Skip rendering individual tokens — they're merged in token groups
  if (isToken) return null;

  const timeStr = (() => {
    try {
      return new Date(event.timestamp).toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  })();

  const content =
    typeof event.content === "string"
      ? event.content
      : JSON.stringify(event.content).slice(0, 200);

  return (
    <motion.div
      ref={cardRef}
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        delay: Math.min(index * 0.02, 0.3),
      }}
      onClick={() => setSelectedEvent(isSelected ? null : event.id)}
      className={cn(
        "group relative border-l-2 pl-3 py-2 cursor-pointer transition-all duration-300",
        config.border,
        isActive
          ? "bg-cyan-500/10 border-l-[3px] border-l-cyan-400 text-white shadow-[0_0_15px_rgba(0,242,255,0.08)] scale-[1.01]"
          : isSelected
          ? "bg-white/[0.03] border-l-[3px]"
          : "hover:bg-white/[0.02] opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon size={11} className={cn(config.color, "opacity-90")} />
          <span
            className={cn(
              "text-[8px] font-extrabold uppercase tracking-[0.15em]",
              config.color,
              "opacity-80"
            )}
          >
            {event.metadata?.toolName || event.type.replace("_", " ")}
          </span>

          {/* Confidence badge */}
          {typeof event.metadata?.confidence === "number" && (
            <span
              className={cn(
                "text-[7px] font-mono px-1 py-px rounded",
                event.metadata.confidence > 0.9
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              )}
            >
              {Math.round(event.metadata.confidence * 100)}%
            </span>
          )}
        </div>
        <span className="text-[8px] font-mono text-white/15">{timeStr}</span>
      </div>

      {/* Content */}
      <p className={cn(
        "text-[11px] leading-[1.5] break-words line-clamp-3",
        isActive ? "text-white font-medium" : "text-white/60"
      )}>
        {content}
      </p>

      {/* Latency */}
      {event.metadata?.latency && (
        <div className="flex items-center gap-1 mt-1">
          <Clock size={8} className="text-white/20" />
          <span className="text-[8px] font-mono text-white/20">
            {event.metadata.latency}ms
          </span>
        </div>
      )}

      {/* Selection indicator */}
      {(isSelected || isActive) && (
        <motion.div
          layoutId="selected-event"
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-400"
        />
      )}
    </motion.div>
  );
};

// ─── Token Stream Display ───────────────────────────────────────────────────

const TokenStream = ({ events }: { events: AetherEvent[] }) => {
  const tokens = events.filter((e) => e.type === "token");
  if (tokens.length === 0) return null;

  const text = tokens.map((t) => t.content).join("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-l-2 border-l-slate-500/20 pl-3 py-2"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <MessageSquare size={11} className="text-slate-500 opacity-60" />
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 opacity-60">
          Token Stream
        </span>
        <span className="text-[7px] font-mono text-white/20">
          {tokens.length} tokens
        </span>
      </div>
      <p className="text-[11px] text-white/50 leading-[1.6] font-mono break-words">
        {text}
        <span className="inline-block w-[2px] h-[12px] bg-cyan-400/60 ml-0.5 animate-typewriter-cursor" />
      </p>
    </motion.div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const StreamSidebar = () => {
  const events = useAetherStore((s) => s.events);
  const activeSession = useAetherStore((s) => s.activeSession);
  const isConnected = useAetherStore((s) => s.isConnected);
  const timelinePosition = useAetherStore((s) => s.timelinePosition);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionEvents = useMemo(
    () =>
      events.filter(
        (e) => e.sessionId === (activeSession || "demo-session")
      ),
    [events, activeSession]
  );

  const visibleEvents = useMemo(() => {
    const count = Math.ceil(sessionEvents.length * timelinePosition);
    return sessionEvents.slice(0, count);
  }, [sessionEvents, timelinePosition]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [visibleEvents]);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleEvents.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
  }, [visibleEvents]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Terminal size={14} className="text-cyan-400" />
            {isConnected && (
              <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            )}
          </div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
              Event Stream
            </h2>
          </div>
        </div>
        <span className="text-[9px] font-mono text-white/20 bg-white/[0.03] px-2 py-1 rounded">
          {visibleEvents.length}
        </span>
      </div>

      {/* Event Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-2 space-y-0"
      >
        <AnimatePresence initial={false}>
          {visibleEvents
            .filter((e) => e.type !== "token")
            .slice(-60)
            .map((event, idx) => (
              <EventCard key={event.id} event={event} index={idx} />
            ))}
        </AnimatePresence>

        {/* Token stream at the bottom */}
        <TokenStream events={visibleEvents} />

        {/* Empty state */}
        {visibleEvents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 animate-pulse" />
              <div className="absolute inset-1.5 rounded-full bg-[#020205] flex items-center justify-center">
                <Cpu size={18} className="text-white/20" />
              </div>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-white/20 mb-1">
              Waiting for events
            </p>
            <p className="text-[9px] text-white/10">
              Run the demo agent to begin
            </p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 bg-white/[0.015] border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 size={10} className="text-white/20" />
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/20">
            Session Metrics
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            { label: "Thoughts", value: stats.thought || 0, color: "text-cyan-400/60" },
            { label: "Tools", value: stats.tool_call || 0, color: "text-amber-400/60" },
            { label: "Memory", value: stats.memory || 0, color: "text-purple-400/60" },
            { label: "Tokens", value: stats.token || 0, color: "text-white/30" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between text-[9px]">
              <span className="text-white/20 uppercase">{label}</span>
              <span className={cn("font-mono font-bold", color)}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
