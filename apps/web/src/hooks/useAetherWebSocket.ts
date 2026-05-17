"use client";
import { useEffect, useRef, useCallback } from "react";
import { useAetherStore, AetherEvent } from "@/store/useAetherStore";

const WS_URL = process.env.NEXT_PUBLIC_AETHER_WS_URL || "ws://localhost:8000";
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 15000;

export const useAetherWebSocket = (sessionId: string | null) => {
  const addEvent = useAetherStore((s) => s.addEvent);
  const addEvents = useAetherStore((s) => s.addEvents);
  const setConnected = useAetherStore((s) => s.setConnected);
  const isConnected = useAetherStore((s) => s.isConnected);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const pingTimer = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!sessionId) return;

    // In production static mode (e.g. Vercel/HF), if WS_URL is not provided, gracefully default to offline-only state silently.
    if (!WS_URL || WS_URL === "ws://") {
      setConnected(false);
      return;
    }

    // Cleanup existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_URL}/ws/${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectCount.current = 0;

        // Start ping interval
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle replay (batch of existing events)
          if (data.type === "replay" && Array.isArray(data.events)) {
            addEvents(data.events as AetherEvent[]);
            return;
          }

          // Handle pong
          if (data.type === "pong") return;

          // Regular event
          addEvent(data as AetherEvent);
        } catch {
          // Silent parsing fallback
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingTimer.current) clearInterval(pingTimer.current);

        // Only auto-reconnect if we are in development environment
        const isDev = process.env.NODE_ENV === "development";
        if (isDev && reconnectCount.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectCount.current++;
          const delay = RECONNECT_DELAY * Math.min(reconnectCount.current, 5);
          reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
        }
      };

      ws.onerror = () => {
        // Silently capture WebSocket error without polluting production console log
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }
  }, [sessionId, addEvent, addEvents, setConnected]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    reconnect: connect,
  };
};
