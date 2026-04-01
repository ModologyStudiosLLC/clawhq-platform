"use client";

import { useEffect, useRef, useState } from "react";

export interface Agent {
  id: string;
  name: string;
  state: string;
  model_name: string;
  model_provider: string;
  ready: boolean;
  last_active: string;
  profile: string | null;
}

export interface Session {
  session_id: string;
  agent_id: string;
  message_count: number;
  created_at: string;
  label: string | null;
}

interface UseAgentStreamResult {
  agents: Agent[];
  sessions: Session[];
  connected: boolean;
  loading: boolean;
}

export function useAgentStream(): UseAgentStreamResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      const es = new EventSource("/api/agents/stream");
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as { type: string; data: unknown };
          if (msg.type === "agents" && Array.isArray(msg.data)) {
            setAgents(msg.data as Agent[]);
            setLoading(false);
          }
          if (msg.type === "sessions" && Array.isArray(msg.data)) {
            setSessions(msg.data as Session[]);
          }
        } catch {
          // malformed message — ignore
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
    };
  }, []);

  return { agents, sessions, connected, loading };
}
