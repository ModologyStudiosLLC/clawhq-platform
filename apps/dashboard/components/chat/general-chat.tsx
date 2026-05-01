"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { ChatInterface } from "./interface";

interface Agent {
  id: string;
  name: string;
  state: string;
  model_provider: string;
  model_name: string;
}

export function GeneralChat() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then((data: unknown) => {
        const list = Array.isArray(data) ? (data as Agent[]) : [];
        setAgents(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const selected = agents.find(a => a.id === selectedId);

  return (
    <div className="flex flex-col h-full">
      {/* Agent picker bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Chatting with
        </span>
        <div>
          <button
            ref={triggerRef}
            onClick={() => {
              if (!open && triggerRef.current) {
                const r = triggerRef.current.getBoundingClientRect();
                setDropPos({ top: r.bottom + 4, left: r.left });
              }
              setOpen(o => !o);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
            }}
          >
            {selected?.name ?? "Select agent"}
            {selected && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: selected.state === "Running" ? "var(--color-secondary)" : "var(--color-error)" }}
              />
            )}
            <ChevronDown size={13} style={{ color: "var(--color-text-muted)" }} />
          </button>

          {open && typeof document !== "undefined" && createPortal(
            <>
              {/* Backdrop to close on outside click */}
              <div className="fixed inset-0 z-[99]" onClick={() => setOpen(false)} />
              <div
                className="fixed w-56 rounded-xl border shadow-lg z-[100] overflow-hidden"
                style={{
                  top: dropPos.top,
                  left: dropPos.left,
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => { setSelectedId(agent.id); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors"
                    style={{
                      color: agent.id === selectedId ? "var(--color-primary)" : "var(--color-text)",
                      background: agent.id === selectedId ? "var(--color-primary-dim)" : "transparent",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: agent.state === "Running" ? "var(--color-secondary)" : "var(--color-error)" }}
                    />
                    <span className="truncate">{agent.name}</span>
                    <span className="ml-auto text-xs" style={{ color: "var(--color-text-subtle)" }}>
                      {agent.model_name?.split("/").pop() ?? agent.model_provider}
                    </span>
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {selectedId ? (
          // key forces remount (new session) when agent changes
          <ChatInterface key={selectedId} agentId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No agents running
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
