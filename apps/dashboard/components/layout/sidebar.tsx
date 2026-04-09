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
  GitMerge,
  LogOut,
  Container,
  HeartPulse,
  Network,
  Shield,
  KeyRound,
  Package,
  Zap,
  BarChart2,
  MessageSquare,
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
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/team", label: "Team", icon: Users },
  { href: "/capabilities", label: "Capabilities", icon: Sparkles },
  { href: "/hermes", label: "Hermes", icon: Brain, accent: true },
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/activity", label: "Activity", icon: ScrollText },
  { href: "/packs", label: "Packs", icon: Package },
  { href: "/security", label: "Security", icon: Shield },
  { href: "/services", label: "Services", icon: Container },
  { href: "/orchestration", label: "Orchestration", icon: GitMerge },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/tunnels", label: "Tunnels", icon: Network },
  { href: "/routing", label: "Routing", icon: Zap },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

const bottom = [
  { href: "/sso", label: "SSO", icon: KeyRound },
  { href: "/sandbox", label: "Sandbox", icon: Shield },
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
      {/* Logo — claw mark + serif wordmark, matches clawhqplatform.com */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22, flexShrink: 0 }}>
          <polygon points="2,24 6,24 13,4 9,4" fill="var(--color-primary)" opacity="0.45"/>
          <polygon points="8,24 12,24 19,4 15,4" fill="var(--color-primary)" opacity="0.72"/>
          <polygon points="14,24 18,24 25,4 21,4" fill="var(--color-primary)"/>
        </svg>
        <div>
          <p className="leading-none" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", color: "var(--color-text)" }}>
            Claw<span style={{ color: "var(--color-primary)" }}>HQ</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-sans)" }}>Modology Studios</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, accent }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const accentColor = accent ? "var(--color-hermes)" : "var(--color-primary)";
          const accentDim = accent ? "var(--color-hermes-dim)" : "var(--color-primary-dim)";
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
            className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
