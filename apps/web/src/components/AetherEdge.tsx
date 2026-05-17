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

  const activePathNodes = useAetherStore((s) => {
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
    return path;
  });

  const isEdgeOnActivePath = activePathNodes.has(target);

  const isActive = data?.isActive;
  const isHallucination = data?.isHallucination;
  const isDestabilized = data?.isDestabilized;

  let strokeColor = "rgba(255, 255, 255, 0.04)";
  let strokeWidth = 1.0;

  if (isEdgeOnActivePath) {
    if (isHallucination || isDestabilized) {
      strokeColor = "rgba(239, 68, 68, 0.85)"; // Red-500
      strokeWidth = 2.5;
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
          stroke={isHallucination ? "rgba(239, 68, 68, 0.22)" : "rgba(0, 242, 255, 0.22)"}
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
        opacity={isEdgeOnActivePath ? 1.0 : 0.15}
      />

      {/* Edge Sweeper Pulse effect */}
      {isEdgeOnActivePath && (
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
          opacity={isEdgeOnActivePath ? 1.0 : 0}
        />
      )}
    </>
  );
};

export default AetherEdge;
