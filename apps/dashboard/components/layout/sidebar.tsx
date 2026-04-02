"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Radio,
  ScrollText,
  Wallet,
  Settings,
  ChevronRight,
  Brain,
  Rocket,
  LogOut,
  Container,
  HeartPulse,
  Network,
} from "lucide-react";
import Image from "next/image";

export interface SidebarUser {
  name: string;
  email: string;
  initials: string;
  avatar?: string;
}

const nav = [
  { href: "/home", label: "Home", icon: LayoutDashboard },
  { href: "/team", label: "Team", icon: Users },
  { href: "/capabilities", label: "Capabilities", icon: Sparkles },
  { href: "/hermes", label: "Hermes", icon: Brain, accent: true },
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/activity", label: "Activity", icon: ScrollText },
  { href: "/services", label: "Services", icon: Container },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/tunnels", label: "Tunnels", icon: Network },
  { href: "/budget", label: "Budget", icon: Wallet },
];

const bottom = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/deploy", label: "Deploy", icon: Rocket },
];

interface SidebarProps {
  user: SidebarUser;
  /** Called when a nav link is tapped — used by mobile shell to close the drawer */
  onNavigate?: () => void;
}

export function Sidebar({ user, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  function handleSignOut() {
    window.location.href = "/auth/sign-out";
  }

  return (
    <aside
      className="w-56 h-full flex-shrink-0 flex flex-col border-r"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            color: "#0e0e10",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          C
        </div>
        <div>
          <p className="font-bold text-sm leading-none" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>ClawHQ</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>Modology Studios</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, accent }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const accentColor = accent ? "var(--color-accent)" : "var(--color-primary)";
          const accentDim = accent ? "var(--color-accent-dim)" : "var(--color-primary-dim)";
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
              style={{
                color: active ? accentColor : "var(--color-text-muted)",
                background: active ? accentDim : "transparent",
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight size={11} className="ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav + user */}
      <div className="px-3 py-3 border-t space-y-0.5" style={{ borderColor: "var(--color-border)" }}>
        {bottom.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                background: active ? "var(--color-primary-dim)" : "transparent",
              }}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* User row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg group"
          style={{ background: "var(--color-surface-2)" }}
        >
          {/* Avatar */}
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
            >
              {user.initials}
            </div>
          )}

          {/* Name / email */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-tight" style={{ color: "var(--color-text)" }}>
              {user.name}
            </p>
            <p className="text-xs truncate leading-tight" style={{ color: "var(--color-text-subtle)" }}>
              {user.email}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
