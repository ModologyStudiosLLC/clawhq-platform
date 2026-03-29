"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  Cpu,
  DollarSign,
  Activity,
  Shield,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  Plus,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Dashboard", active: true, badge: null },
  { icon: Cpu, label: "Agents", active: false, badge: "8" },
  { icon: DollarSign, label: "Costs", active: false, badge: "3" },
  { icon: Activity, label: "Activity", active: false, badge: "12" },
  { icon: Shield, label: "Security", active: false, badge: null },
  { icon: Users, label: "Team", active: false, badge: null },
  { icon: BarChart3, label: "Analytics", active: false, badge: null },
];

const secondaryItems = [
  { icon: Settings, label: "Settings" },
  { icon: HelpCircle, label: "Help & Support" },
];

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "hidden lg:flex flex-col border-r border-white/10 bg-gray-950/50 backdrop-blur-xl transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-gray-800 bg-gray-900 shadow-lg hover:bg-gray-800"
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronRight className={cn(
          "h-3 w-3 transition-transform",
          collapsed && "rotate-180"
        )} />
      </Button>

      {/* Brand Section */}
      <div className="p-6 border-b border-white/10">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h3 className="font-semibold">ClawHQ Platform</h3>
              <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11 rounded-lg",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Button>
          ))}
        </div>

        {/* Deploy New Agent */}
        <div className="mt-8">
          <Button className="w-full gap-2 h-11 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="h-4 w-4" />
            {!collapsed && "Deploy New Agent"}
          </Button>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="p-4 border-t border-white/10">
        <div className="space-y-1">
          {secondaryItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 rounded-lg text-gray-400 hover:text-white",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          ))}
        </div>

        {/* System Status */}
        {!collapsed && (
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium">All systems operational</span>
            </div>
            <p className="text-xs text-gray-400">Last updated: Just now</p>
          </div>
        )}
      </div>
    </aside>
  );
}