"use client";

import { useState, useCallback } from "react";
import { Sidebar, type SidebarUser } from "./sidebar";
import { Header } from "./header";

interface DashboardShellProps {
  user: SidebarUser;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = useCallback(() => setSidebarOpen(false), []);
  const toggle = useCallback(() => setSidebarOpen(prev => !prev), []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <div
        className={[
          // Mobile: fixed overlay drawer, slides in from left
          "fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: static, always visible, no transform
          "md:static md:translate-x-0 md:z-auto md:transition-none",
        ].join(" ")}
      >
        <Sidebar user={user} onNavigate={close} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={toggle} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
