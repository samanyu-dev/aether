"use client";
import React from "react";
import { EdgeProps, getSmoothStepPath } from "reactflow";

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
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isActive = data?.isActive;
  const isHallucination = data?.isHallucination;
  const isDestabilized = data?.isDestabilized;

  let strokeColor = "rgba(255, 255, 255, 0.08)";
  let strokeWidth = 1.5;

  if (isHallucination || isDestabilized) {
    strokeColor = "rgba(239, 68, 68, 0.8)"; // Red-500
    strokeWidth = 2.5;
  } else if (isActive) {
    strokeColor = "rgba(0, 242, 255, 0.8)"; // Cyan-400
    strokeWidth = 2;
  }

  return (
    <>
      {/* Dynamic Glow Drop Shadow layer */}
      {isActive && (
        <path
          id={`${id}-glow`}
          className="react-flow__edge-path transition-all duration-300"
          d={edgePath}
          stroke={isHallucination ? "rgba(239, 68, 68, 0.25)" : "rgba(0, 242, 255, 0.25)"}
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
      />

      {/* Edge Sweeper Pulse effect */}
      <path
        d={edgePath}
        fill="none"
        stroke={isHallucination ? "#ef4444" : "#00f2ff"}
        strokeWidth={strokeWidth + 0.5}
        strokeDasharray="12 40"
        strokeDashoffset="100"
        className="animate-[edgeSweep_2.5s_linear_infinite]"
        style={{
          animationDirection: "normal",
        }}
        opacity={isActive ? 1 : 0.25}
      />
    </>
  );
};

export default AetherEdge;
