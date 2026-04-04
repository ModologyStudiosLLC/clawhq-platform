"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, LayoutDashboard, Activity, Wallet, Settings, Plug, Zap, Package, Users, X } from "lucide-react";

interface Result {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
}

const NAV_ITEMS = [
  { label: "Home", sub: "What your agents are up to", href: "/home", icon: <LayoutDashboard size={14} /> },
  { label: "Your Team", sub: "The agents working for you", href: "/team", icon: <Users size={14} /> },
  { label: "Channels", sub: "Where your agents communicate", href: "/channels", icon: <Plug size={14} /> },
  { label: "Activity", sub: "Everything your agents have done", href: "/activity", icon: <Activity size={14} /> },
  { label: "Budget", sub: "What you're spending", href: "/budget", icon: <Wallet size={14} /> },
  { label: "Capabilities", sub: "What your agents can do", href: "/capabilities", icon: <Zap size={14} /> },
  { label: "Settings", sub: "API keys and configuration", href: "/settings", icon: <Settings size={14} /> },
  { label: "Deploy", sub: "One-click deploy to Railway, Render, or DigitalOcean", href: "/deploy", icon: <Package size={14} /> },
  { label: "Hermes", sub: "Autonomous cognitive agent", href: "/hermes", icon: <Bot size={14} /> },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<{ id: string; name: string; model_provider: string }[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load agents once on first open
  useEffect(() => {
    if (open && agents.length === 0) {
      fetch("/api/agents")
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setAgents(d); })
        .catch(() => {});
    }
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const buildResults = useCallback((): Result[] => {
    const q = query.toLowerCase().trim();

    const navResults: Result[] = NAV_ITEMS
      .filter(n => !q || n.label.toLowerCase().includes(q) || (n.sub ?? "").toLowerCase().includes(q))
      .map(n => ({
        id: `nav-${n.href}`,
        label: n.label,
        sub: n.sub,
        icon: n.icon,
        group: "Pages",
        action: () => { router.push(n.href); onClose(); },
      }));

    const agentResults: Result[] = agents
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
      .map(a => ({
        id: `agent-${a.id}`,
        label: a.name,
        sub: `Chat · ${a.model_provider}`,
        icon: <Bot size={14} />,
        group: "Agents",
        action: () => { router.push(`/team/${a.id}`); onClose(); },
      }));

    return [...navResults, ...agentResults];
  }, [query, agents, router, onClose]);

  const results = buildResults();

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { results[selected].action(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected, onClose]);

  // Reset selection when results change
  useEffect(() => { setSelected(0); }, [query]);

  if (!open) return null;

  // Group results
  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = [];
    acc[r.group].push(r);
    return acc;
  }, {});

  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="fixed z-50 w-full max-w-xl mx-auto"
        style={{ top: "15vh", left: "50%", transform: "translateX(-50%)" }}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>

          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: "1px solid var(--color-border)" }}>
            <Search size={15} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search pages, agents, settings…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--color-text)" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ color: "var(--color-text-muted)" }}>
                <X size={13} />
              </button>
            )}
            <kbd className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "var(--color-border)", color: "var(--color-text-subtle)", fontSize: "10px" }}>
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "var(--color-text-subtle)", background: "var(--color-surface-2)" }}>
                    {group}
                  </div>
                  {items.map(result => {
                    const idx = flatIndex++;
                    const isSelected = idx === selected;
                    return (
                      <button
                        key={result.id}
                        onClick={result.action}
                        onMouseEnter={() => setSelected(idx)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{
                          background: isSelected ? "var(--color-primary-dim)" : "transparent",
                          borderLeft: isSelected ? "2px solid var(--color-primary)" : "2px solid transparent",
                        }}
                      >
                        <span style={{ color: isSelected ? "var(--color-primary)" : "var(--color-text-muted)" }}>
                          {result.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate"
                            style={{ color: isSelected ? "var(--color-text)" : "var(--color-text)" }}>
                            {result.label}
                          </div>
                          {result.sub && (
                            <div className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                              {result.sub}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <kbd className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: "var(--color-border)", color: "var(--color-text-subtle)", fontSize: "10px" }}>
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 flex items-center gap-4 text-xs"
            style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-subtle)" }}>
            <span><kbd style={{ background: "var(--color-border)", borderRadius: 3, padding: "1px 4px" }}>↑↓</kbd> navigate</span>
            <span><kbd style={{ background: "var(--color-border)", borderRadius: 3, padding: "1px 4px" }}>↵</kbd> open</span>
            <span><kbd style={{ background: "var(--color-border)", borderRadius: 3, padding: "1px 4px" }}>ESC</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  );
}
