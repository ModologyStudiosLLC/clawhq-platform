"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search, ArrowUpCircle, CheckCircle2, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/home": { title: "Home", subtitle: "What your agents are up to" },
  "/hermes": { title: "Hermes", subtitle: "Autonomous cognitive agent by Nous Research" },
  "/team": { title: "Your Team", subtitle: "The agents working for you" },
  "/capabilities": { title: "Capabilities", subtitle: "What your agents can do" },
  "/channels": { title: "Channels", subtitle: "Where your agents communicate" },
  "/activity": { title: "Activity", subtitle: "Everything your agents have done" },
  "/budget": { title: "Budget", subtitle: "What you're spending" },
  "/analytics": { title: "Analytics", subtitle: "Token spend and cost over time" },
  "/settings": { title: "Settings", subtitle: "API keys and configuration" },
  "/deploy":    { title: "Deploy",   subtitle: "One-click deploy to Railway, Render, or DigitalOcean" },
  "/packs":     { title: "Packs",    subtitle: "Workflow kits for your agents" },
  "/security":  { title: "Security", subtitle: "Sentinel — 6-layer AI agent defense" },
};

function resolveTitle(pathname: string): { title: string; subtitle: string } {
  if (titles[pathname]) return titles[pathname];
  if (/^\/team\/[^/]+$/.test(pathname)) return { title: "Chat", subtitle: "Talking to your agent" };
  if (/^\/team\/[^/]+\/settings/.test(pathname)) return { title: "Agent Settings", subtitle: "Configure this agent" };
  return { title: "ClawHQ", subtitle: "" };
}

interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface VersionInfo {
  current: string;
  latest: string;
  upToDate: boolean;
  commitsAhead: number;
  recentCommits: CommitSummary[];
  error?: string;
}

function UpdateDropdown({ version, onClose }: { version: VersionInfo; onClose: () => void }) {
  const isDev = version.current === "dev";

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border z-50"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-2">
          {version.upToDate ? (
            <CheckCircle2 size={14} style={{ color: "var(--color-secondary)" }} />
          ) : (
            <ArrowUpCircle size={14} style={{ color: "var(--color-primary)" }} />
          )}
          <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
            {version.upToDate ? "Up to date" : `${version.commitsAhead === -1 ? "?" : version.commitsAhead} commit${version.commitsAhead !== 1 ? "s" : ""} behind`}
          </span>
        </div>
        <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}>
          <X size={13} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: "var(--color-text-muted)" }}>Current</span>
          <code style={{ color: "var(--color-text)" }}>{version.current}</code>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: "var(--color-text-muted)" }}>Latest (main)</span>
          <code style={{ color: "var(--color-text)" }}>{version.latest}</code>
        </div>
        {isDev && (
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Running in dev mode — set <code>CLAWHQ_GIT_SHA</code> at build time for exact tracking.
          </p>
        )}
      </div>

      {!version.upToDate && version.recentCommits.length > 0 && (
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            What's new
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {version.recentCommits.map(c => (
              <div key={c.sha} className="text-xs flex gap-2">
                <code className="flex-shrink-0 mt-px" style={{ color: "var(--color-text-muted)" }}>{c.sha}</code>
                <span className="truncate" style={{ color: "var(--color-text)" }}>{c.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!version.upToDate && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
          <a
            href="https://github.com/modologystudios/clawhq/blob/main/docs/updating.md"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs font-medium py-2 px-4 rounded-lg transition-all"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            How to update →
          </a>
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const page = resolveTitle(pathname);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Check for updates once on mount
  useEffect(() => {
    fetch("/api/version")
      .then(r => r.json())
      .then(d => setVersion(d))
      .catch(() => null);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!updateOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUpdateOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [updateOpen]);

  const hasUpdate = version && !version.upToDate;

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 py-4 border-b flex-shrink-0 sticky top-0 z-10"
      style={{
        background: "color-mix(in srgb, var(--color-bg) 82%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg -ml-1"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{page.subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <Search size={13} />
          <span className="text-xs hidden sm:block">Search</span>
          <kbd className="hidden sm:block text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-subtle)", fontSize: "10px" }}>⌘K</kbd>
        </button>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        {/* Update / notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setUpdateOpen(v => !v)}
            className="relative p-2 rounded-lg transition-colors"
            title={hasUpdate ? `${version.commitsAhead} update${version.commitsAhead !== 1 ? "s" : ""} available` : "No updates"}
            style={{ color: hasUpdate ? "var(--color-primary)" : "var(--color-text-muted)" }}
          >
            <Bell size={15} />
            {hasUpdate && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ background: "var(--color-primary)", boxShadow: "0 0 0 2px var(--color-bg)" }}
              />
            )}
          </button>
          {updateOpen && version && (
            <UpdateDropdown version={version} onClose={() => setUpdateOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
}
