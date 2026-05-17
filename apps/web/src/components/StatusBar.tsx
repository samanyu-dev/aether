"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAetherStore } from "@/store/useAetherStore";

export const StatusBar = () => {
  const isConnected = useAetherStore((s) => s.isConnected);
  const events = useAetherStore((s) => s.events);
  const activeSession = useAetherStore((s) => s.activeSession);
  const [latency, setLatency] = useState(0);
  const [uptime, setUptime] = useState("00:00:00");
  const startTime = React.useRef<number>(0);

  useEffect(() => {
    startTime.current = Date.now();
    const interval = setInterval(() => {
      if (startTime.current) {
        const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
        const h = Math.floor(elapsed / 3600)
          .toString()
          .padStart(2, "0");
        const m = Math.floor((elapsed % 3600) / 60)
          .toString()
          .padStart(2, "0");
        const s = (elapsed % 60).toString().padStart(2, "0");
        setUptime(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate latency measurement from events
  useEffect(() => {
    if (events.length > 0) {
      const last = events[events.length - 1];
      try {
        const eventTime = new Date(last.timestamp).getTime();
        const now = Date.now();
        const computed = Math.max(1, Math.min(now - eventTime, 999));
        setTimeout(() => setLatency(computed), 0);
      } catch {
        const fallback = Math.floor(Math.random() * 15 + 3);
        setTimeout(() => setLatency(fallback), 0);
      }
    }
  }, [events]);

  return (
    <motion.footer
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="h-7 glass border-t border-white/[0.04] px-4 flex items-center justify-between z-30"
    >
      <div className="flex items-center gap-5">
        {/* Engine status */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1 h-1 rounded-full ${
              isConnected
                ? "bg-emerald-400 shadow-[0_0_6px_#10b981]"
                : "bg-white/15"
            }`}
          />
          <span className="text-[9px] font-mono text-white/25 uppercase">
            {isConnected ? "Engine Online" : "Engine Offline"}
          </span>
        </div>

        {/* Latency */}
        {isConnected && (
          <span className="text-[9px] font-mono text-white/20">
            Latency:{" "}
            <span className="text-white/35">{latency}ms</span>
          </span>
        )}

        {/* Session */}
        {activeSession && (
          <span className="text-[9px] font-mono text-white/15 truncate max-w-[200px]">
            Session: {activeSession}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <span className="text-[9px] font-mono text-white/15">
          Uptime: {uptime}
        </span>
        <span className="text-[9px] font-mono text-white/15">
          Events: {events.length}
        </span>
        <span className="text-[9px] font-mono text-white/10">
          v0.2.0-alpha
        </span>
      </div>
    </motion.footer>
  );
};
