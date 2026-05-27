"use client";
import React from "react";
import { EdgeProps, getBezierPath } from "reactflow";
import { useAetherStore } from "@/store/useAetherStore";

export const AetherEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  target,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const targetEvent = useAetherStore((s) => s.events.find((e) => e.id === target));
  const isEdgeOnActivePath = useAetherStore((s) => s.activePathNodeIds.includes(target));

  const isActive = data?.isActive;
  const isHallucination = data?.isHallucination;
  const isDestabilized = data?.isDestabilized;
  const isCorrection = targetEvent?.metadata?.selfCorrection;
  const diffStatus = data?.diffStatus;
  const latencyDelta = data?.latencyDelta;

  let strokeColor = "rgba(255, 255, 255, 0.08)";
  let strokeWidth = 0.8;

  if (isEdgeOnActivePath) {
    if (isHallucination || isDestabilized) {
      strokeColor = "rgba(239, 68, 68, 0.85)"; // Red-500
      strokeWidth = 3.2;
    } else if (isCorrection) {
      strokeColor = "rgba(16, 185, 129, 0.9)"; // Emerald-500 stabilization
      strokeWidth = 2.8;
    } else if (diffStatus === 'added') {
      strokeColor = "rgba(16, 185, 129, 0.85)"; // Emerald-500 added edge
      strokeWidth = 2.4;
    } else if (diffStatus === 'modified') {
      strokeColor = "rgba(245, 158, 11, 0.85)"; // Amber-500 modified edge
      strokeWidth = 2.4;
    } else if (diffStatus === 'deleted') {
      strokeColor = "rgba(239, 68, 68, 0.45)"; // Rose-500 deleted edge
      strokeWidth = 2.0;
    } else {
      strokeColor = "rgba(0, 242, 255, 0.85)"; // Cyan-400
      strokeWidth = 2.4;
    }
  } else if (diffStatus === 'deleted') {
    strokeColor = "rgba(239, 68, 68, 0.15)";
    strokeWidth = 1.0;
  }

  // Sweep pacing interpolation: faster for latency speedups, sluggish for bottlenecks
  let sweepDuration = "1.8s";
  if (latencyDelta !== undefined && latencyDelta !== 0) {
    if (latencyDelta < 0) {
      sweepDuration = `${Math.max(0.6, 1.8 + (latencyDelta / 150))}s`;
    } else {
      sweepDuration = `${Math.min(4.0, 1.8 + (latencyDelta / 150))}s`;
    }
  }

  const sweeperColor = isHallucination
    ? "#ef4444"
    : isCorrection || diffStatus === 'added'
    ? "#10b981"
    : diffStatus === 'modified'
    ? "#f59e0b"
    : diffStatus === 'deleted'
    ? "#f43f5e"
    : "#00f2ff";

  return (
    <>
      {/* Animated Safety Under-glow for hallucination heatmaps */}
      {isHallucination && isEdgeOnActivePath && (
        <path
          d={edgePath}
          fill="none"
          stroke="rgba(239, 68, 68, 0.15)"
          strokeWidth={strokeWidth * 6}
          className="animate-[pulseGlow_2.5s_ease-in-out_infinite]"
        />
      )}

      {/* Dynamic Glow Drop Shadow layer */}
      {isEdgeOnActivePath && (
        <path
          id={`${id}-glow`}
          className="react-flow__edge-path transition-all duration-300"
          d={edgePath}
          stroke={
            isHallucination 
              ? "rgba(239, 68, 68, 0.22)" 
              : isCorrection || diffStatus === 'added'
              ? "rgba(16, 185, 129, 0.25)"
              : diffStatus === 'modified'
              ? "rgba(245, 158, 11, 0.25)"
              : diffStatus === 'deleted'
              ? "rgba(244, 63, 94, 0.15)"
              : "rgba(0, 242, 255, 0.22)"
          }
          strokeWidth={strokeWidth * 3}
          fill="none"
        />
      )}

      {/* Primary SVG Path */}
      <path
        id={id}
        className={`react-flow__edge-path transition-all duration-300 ${
          isDestabilized ? "animate-pulse" : ""
        }`}
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isHallucination || diffStatus === 'deleted' ? "4 4" : undefined}
        fill="none"
        style={style}
        opacity={isEdgeOnActivePath ? 1.0 : diffStatus === 'deleted' ? 0.35 : 0.12}
      />

      {/* Edge Sweeper Pulse effect */}
      {isEdgeOnActivePath && diffStatus !== 'deleted' && (
        <path
          d={edgePath}
          fill="none"
          stroke={sweeperColor}
          strokeWidth={strokeWidth + 0.6}
          strokeDasharray="14 36"
          strokeDashoffset="100"
          className="animate-[edgeSweep_1.8s_linear_infinite]"
          style={{
            animationDuration: sweepDuration,
            animationDirection: "normal",
          }}
          opacity={isEdgeOnActivePath ? 1.0 : 0}
        />
      )}

      {/* Floating Glassmorphic Latency Delta Label Bubble */}
      {latencyDelta !== undefined && Math.abs(latencyDelta) > 10 && (
        <foreignObject
          width={68}
          height={24}
          x={labelX - 34}
          y={labelY - 12}
          className="pointer-events-none"
        >
          <div className={`flex items-center justify-center rounded-md px-1.5 py-0.5 text-[8.5px] font-mono font-extrabold border backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 ${
            latencyDelta < 0
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400"
              : "bg-rose-950/80 border-rose-500/40 text-rose-400"
          }`}>
            {latencyDelta < 0 ? `${latencyDelta}ms` : `+${latencyDelta}ms`}
          </div>
        </foreignObject>
      )}

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.25; stroke-width: ${strokeWidth * 4}px; }
          50% { opacity: 0.65; stroke-width: ${strokeWidth * 7}px; }
        }
        @keyframes edgeSweep {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </>
  );
};

export default AetherEdge;
