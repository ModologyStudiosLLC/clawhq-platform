"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/home": { title: "Home", subtitle: "What your agents are up to" },
  "/team": { title: "Your Team", subtitle: "The agents working for you" },
  "/capabilities": { title: "Capabilities", subtitle: "What your agents can do" },
  "/channels": { title: "Channels", subtitle: "Where your agents communicate" },
  "/activity": { title: "Activity", subtitle: "Everything your agents have done" },
  "/budget": { title: "Budget", subtitle: "What you're spending" },
  "/settings": { title: "Settings", subtitle: "API keys and configuration" },
};

export function Header() {
  const pathname = usePathname();
  const page = titles[pathname] || { title: "ClawHQ", subtitle: "" };

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div>
        <h1 className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{page.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <Search size={13} />
          <span className="text-xs hidden sm:block">Search</span>
          <kbd className="hidden sm:block text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-subtle)", fontSize: "10px" }}>⌘K</kbd>
        </div>
        <button className="relative p-2 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-error, #ff6b6b)" }} />
        </button>
      </div>
    </header>
  );
}
