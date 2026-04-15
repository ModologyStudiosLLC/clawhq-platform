"use client";

import { useState } from "react";
import { TeamDirectory } from "./directory";
import { MembersPanel } from "./members-panel";

type LicenseTier = "free" | "pro" | "enterprise";

interface Props {
  showMembers: boolean;
  showRBAC: boolean;
  tier: LicenseTier;
}

export function TeamPageClient({ showMembers, tier }: Props) {
  const [tab, setTab] = useState<"agents" | "members">("agents");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tab bar — only show tabs when members management is enabled */}
      {showMembers && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--color-surface)" }}>
          {(["agents", "members"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={
                tab === t
                  ? { background: "var(--color-surface-2)", color: "var(--color-text)" }
                  : { color: "var(--color-text-muted)" }
              }
            >
              {t === "agents" ? "AI Agents" : "Members"}
            </button>
          ))}
        </div>
      )}

      {tab === "agents" ? (
        <TeamDirectory />
      ) : (
        <MembersPanel />
      )}
    </div>
  );
}
