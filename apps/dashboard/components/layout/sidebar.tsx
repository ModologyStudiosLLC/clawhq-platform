"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  DollarSign,
  Plug,
  Target,
  Shield,
  Settings,
  ChevronRight,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/security", label: "Security", icon: Shield },
];

const bottom = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            color: "#0e0e10",
            fontFamily: "var(--font-manrope, Manrope, sans-serif)",
          }}
        >
          C
        </div>
        <span
          className="font-bold text-base tracking-tight"
          style={{ fontFamily: "var(--font-manrope, Manrope, sans-serif)", color: "var(--color-text)" }}
        >
          ClawHQ
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                background: active ? "var(--color-primary-dim)" : "transparent",
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: "var(--color-border)" }}>
        {bottom.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                background: active ? "var(--color-primary-dim)" : "transparent",
              }}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Agent identity */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mt-2"
          style={{ background: "var(--color-surface-2)" }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
          >
            F
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--color-text)" }}>Felix</p>
            <p className="text-xs truncate" style={{ color: "var(--color-text-subtle)" }}>Modology Studios</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
