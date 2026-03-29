"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, RefreshCw } from "lucide-react";
import { useState } from "react";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Monitor your agent ecosystem in real-time" },
  "/agents": { title: "Agents", subtitle: "Manage your OpenClaw agent fleet" },
  "/costs": { title: "Cost Intelligence", subtitle: "Track and optimize AI spend" },
  "/connections": { title: "Connections", subtitle: "MCP servers and integrations" },
  "/goals": { title: "Goals & Tasks", subtitle: "Strategic objectives and pipeline" },
  "/security": { title: "Security", subtitle: "Access control and audit logs" },
  "/settings": { title: "Settings", subtitle: "Configure ClawHQ platform" },
};

export function Header() {
  const pathname = usePathname();
  const page = titles[pathname] || { title: "ClawHQ", subtitle: "" };
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div>
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-manrope, Manrope, sans-serif)", color: "var(--color-text)" }}
        >
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {page.subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
        >
          <Search size={14} />
          <span className="text-xs hidden sm:block">Search...</span>
          <kbd className="hidden sm:block text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-subtle)" }}>⌘K</kbd>
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--color-text-muted)", background: "transparent" }}
          title="Refresh"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: "var(--color-text-muted)", background: "transparent" }}
        >
          <Bell size={16} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--color-error)" }}
          />
        </button>
      </div>
    </header>
  );
}
