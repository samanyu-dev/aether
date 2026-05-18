"use client";
import React from "react";
import { EdgeProps, getSmoothStepPath } from "reactflow";
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
  const [edgePath] = getSmoothStepPath({
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

  let strokeColor = "rgba(255, 255, 255, 0.03)";
  let strokeWidth = 1.0;

  if (isEdgeOnActivePath) {
    if (isHallucination || isDestabilized) {
      strokeColor = "rgba(239, 68, 68, 0.85)"; // Red-500
      strokeWidth = 2.5;
    } else if (isCorrection) {
      strokeColor = "rgba(16, 185, 129, 0.9)"; // Emerald-500 stabilization
      strokeWidth = 2.2;
    } else {
      strokeColor = "rgba(0, 242, 255, 0.85)"; // Cyan-400
      strokeWidth = 2.0;
    }
  }

  return (
    <>
      {/* Dynamic Glow Drop Shadow layer */}
      {isEdgeOnActivePath && (
        <path
          id={`${id}-glow`}
          className="react-flow__edge-path transition-all duration-300"
          d={edgePath}
          stroke={
            isHallucination 
              ? "rgba(239, 68, 68, 0.22)" 
              : isCorrection 
              ? "rgba(16, 185, 129, 0.25)" 
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
        fill="none"
        style={style}
        opacity={isEdgeOnActivePath ? 1.0 : 0.05}
      />

      {/* Edge Sweeper Pulse effect */}
      {isEdgeOnActivePath && (
        <path
          d={edgePath}
          fill="none"
          stroke={
            isHallucination 
              ? "#ef4444" 
              : isCorrection 
              ? "#10b981" 
              : "#00f2ff"
          }
          strokeWidth={strokeWidth + 0.5}
          strokeDasharray="12 40"
          strokeDashoffset="100"
          className="animate-[edgeSweep_2.5s_linear_infinite]"
          style={{
            animationDirection: "normal",
          }}
          opacity={isEdgeOnActivePath ? 1.0 : 0}
        />
      )}
    </>
  );
};

export default AetherEdge;
