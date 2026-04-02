"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentEventType =
  | "agent.started"
  | "agent.completed"
  | "agent.error"
  | "session.started"
  | "session.finished";

export interface AgentEvent {
  type: AgentEventType;
  agentId?: string;
  sessionId?: string;
  message?: string;
  ts: number;
}

interface UseAgentSocketResult {
  events: AgentEvent[];
  connected: boolean;
  error: string | null;
  lastTs: number | null;
}

// ── Ring buffer (module-level singleton — shared across consumers) ─────────────

const RING_SIZE = 100;
const ringBuffer: AgentEvent[] = [];
let ringConnected = false;
let ringError: string | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn());
}

function pushEvent(event: AgentEvent) {
  if (ringBuffer.length >= RING_SIZE) {
    ringBuffer.shift();
  }
  ringBuffer.push(event);
  notify();
}

function setConnected(val: boolean) {
  if (ringConnected !== val) {
    ringConnected = val;
    notify();
  }
}

function setError(val: string | null) {
  if (ringError !== val) {
    ringError = val;
    notify();
  }
}

// ── WS URL helper ─────────────────────────────────────────────────────────────

function getWsUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_OPENCLAW_URL;
  if (!base) return null;
  const wsBase = base.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://").replace(/\/$/, "");
  return `${wsBase}/ws`;
}

// ── Polling fallback ─────────────────────────────────────────────────────────

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let pollingConsumers = 0;

function startPolling() {
  if (pollingInterval !== null) return;
  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setConnected(false); // connected=false means polling mode
        setError(null);
      }
    } catch {
      // health check failed — no-op, error already set
    }
  }, 30_000);
}

function stopPolling() {
  if (pollingInterval !== null) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// ── WebSocket manager (singleton) ─────────────────────────────────────────────

let ws: WebSocket | null = null;
let wsConsumers = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 1000; // ms

const KNOWN_EVENT_TYPES: Set<AgentEventType> = new Set([
  "agent.started",
  "agent.completed",
  "agent.error",
  "session.started",
  "session.finished",
]);

function isAgentEventType(t: unknown): t is AgentEventType {
  return typeof t === "string" && KNOWN_EVENT_TYPES.has(t as AgentEventType);
}

function parseWsMessage(raw: string): AgentEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (!isAgentEventType(obj.type)) return null;
    return {
      type: obj.type,
      agentId: typeof obj.agentId === "string" ? obj.agentId : undefined,
      sessionId: typeof obj.sessionId === "string" ? obj.sessionId : undefined,
      message: typeof obj.message === "string" ? obj.message : undefined,
      ts: typeof obj.ts === "number" ? obj.ts : Date.now(),
    };
  } catch {
    return null;
  }
}

function scheduleReconnect(url: string) {
  if (reconnectTimer !== null) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWs(url);
  }, backoff);
  backoff = Math.min(backoff * 2, 30_000);
}

function connectWs(url: string) {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    ws = new WebSocket(url);
  } catch {
    setError("WebSocket connection failed");
    setConnected(false);
    startPolling();
    return;
  }

  ws.onopen = () => {
    backoff = 1000;
    setConnected(true);
    setError(null);
    stopPolling();
  };

  ws.onmessage = (evt) => {
    const event = parseWsMessage(evt.data as string);
    if (!event) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[useAgentSocket] Unrecognised message shape:", evt.data);
      }
      return;
    }
    pushEvent(event);
  };

  ws.onclose = () => {
    setConnected(false);
    if (wsConsumers > 0) {
      startPolling();
      scheduleReconnect(url);
    }
  };

  ws.onerror = () => {
    setError("WebSocket error");
    setConnected(false);
    ws?.close();
  };
}

function mountWs() {
  wsConsumers++;
  if (wsConsumers === 1) {
    const url = getWsUrl();
    if (url) {
      connectWs(url);
    } else {
      setError("NEXT_PUBLIC_OPENCLAW_URL not set");
      startPolling();
    }
  }
}

function unmountWs() {
  wsConsumers--;
  pollingConsumers--;
  if (wsConsumers <= 0) {
    wsConsumers = 0;
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopPolling();
    backoff = 1000;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAgentSocket(): UseAgentSocketResult {
  const [snapshot, setSnapshot] = useState(() => ({
    events: [...ringBuffer],
    connected: ringConnected,
    error: ringError,
    lastTs: ringBuffer.length > 0 ? ringBuffer[ringBuffer.length - 1].ts : null,
  }));

  useEffect(() => {
    function onUpdate() {
      setSnapshot({
        events: [...ringBuffer],
        connected: ringConnected,
        error: ringError,
        lastTs: ringBuffer.length > 0 ? ringBuffer[ringBuffer.length - 1].ts : null,
      });
    }

    listeners.add(onUpdate);
    pollingConsumers++;
    mountWs();

    return () => {
      listeners.delete(onUpdate);
      unmountWs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return snapshot;
}
