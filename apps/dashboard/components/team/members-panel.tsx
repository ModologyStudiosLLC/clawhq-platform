"use client";

import { useEffect, useState } from "react";
import { UserPlus, Shield, User, Eye, MoreHorizontal, Mail, Crown, AlertCircle } from "lucide-react";

type Role = "admin" | "member" | "viewer";
type Status = "active" | "pending" | "revoked";

interface Member {
  email: string;
  role: Role;
  name: string | null;
  invitedAt: string;
  status: Status;
}

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  admin: <Crown size={12} />,
  member: <User size={12} />,
  viewer: <Eye size={12} />,
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "var(--color-primary)",
  member: "var(--color-secondary)",
  viewer: "var(--color-text-muted)",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatLimit, setSeatLimit] = useState<number>(Infinity);
  const [tier, setTier] = useState<string>("free");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/members").catch(() => null);
    if (!r?.ok) { setLoading(false); return; }
    const d = await r.json();
    setMembers(d.members ?? []);
    setSeatLimit(d.seatLimit ?? Infinity);
    setTier(d.tier ?? "free");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function doInvite() {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setError(null);
    const r = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", email: inviteEmail.trim(), role: inviteRole }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error); setInviteLoading(false); return; }
    setInviteEmail("");
    setInviteLoading(false);
    setShowInvite(false);
    load();
  }

  async function doUpdateRole(email: string, role: Role) {
    await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-role", email, role }),
    });
    setOpenMenu(null);
    load();
  }

  async function doRevoke(email: string) {
    await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", email }),
    });
    setOpenMenu(null);
    load();
  }

  const active = members.filter(m => m.status !== "revoked");
  const seatUsed = active.length;
  const seatFull = seatUsed >= seatLimit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {loading ? "Loading..." : `${seatUsed} ${seatLimit < Infinity ? `/ ${seatLimit} ` : ""}member${seatUsed !== 1 ? "s" : ""} · ${tier} plan`}
        </span>
        <button
          onClick={() => { setShowInvite(true); setError(null); }}
          disabled={seatFull}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            color: "var(--color-on-brand)",
          }}
        >
          <UserPlus size={14} />
          Invite member
        </button>
      </div>

      {/* Seat limit warning */}
      {seatFull && tier !== "enterprise" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: "color-mix(in srgb, var(--color-primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)" }}
        >
          <AlertCircle size={16} style={{ color: "var(--color-primary)", marginTop: 1, flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Seat limit reached</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {tier === "free" ? "Free plan includes 1 member." : `${tier === "pro" ? "Pro" : "Current"} plan includes ${seatLimit} members.`}{" "}
              <a href="mailto:hello@clawhqplatform.com?subject=Enterprise%20Upgrade" style={{ color: "var(--color-primary)" }}>
                Contact us to upgrade →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div
          className="p-5 rounded-xl space-y-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            Invite a team member
          </p>
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--color-error) 10%, transparent)", color: "var(--color-error)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doInvite()}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                outline: "none",
              }}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={doInvite}
              disabled={inviteLoading || !inviteEmail.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: "var(--color-primary)", color: "var(--color-on-brand)" }}
            >
              {inviteLoading ? "Sending..." : "Send invite"}
            </button>
            <button
              onClick={() => { setShowInvite(false); setError(null); setInviteEmail(""); }}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cancel
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
            <Shield size={11} style={{ display: "inline", marginRight: 4 }} />
            Admin — full access &nbsp;·&nbsp; Member — agents &amp; channels &nbsp;·&nbsp; Viewer — read-only
          </p>
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl"
          style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}
        >
          <Mail size={24} style={{ color: "var(--color-text-subtle)", marginBottom: 8 }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>No members yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>Invite a colleague to collaborate</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(m => (
            <div
              key={m.email}
              className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}
              >
                {(m.name ?? m.email)[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                  {m.name ?? m.email}
                </p>
                {m.name && (
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{m.email}</p>
                )}
              </div>

              {/* Status */}
              {m.status === "pending" && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "color-mix(in srgb, var(--color-text-muted) 10%, transparent)", color: "var(--color-text-muted)" }}
                >
                  Pending
                </span>
              )}

              {/* Role badge */}
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${ROLE_COLORS[m.role]} 12%, transparent)`,
                  color: ROLE_COLORS[m.role],
                }}
              >
                {ROLE_ICONS[m.role]}
                {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
              </span>

              <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-subtle)" }}>
                {timeAgo(m.invitedAt)}
              </span>

              {/* Menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenMenu(openMenu === m.email ? null : m.email)}
                  className="p-1.5 rounded-lg"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <MoreHorizontal size={15} />
                </button>
                {openMenu === m.email && (
                  <div
                    className="absolute right-0 top-8 z-20 rounded-xl shadow-xl py-1 min-w-[160px]"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    {(["admin", "member", "viewer"] as Role[]).filter(r => r !== m.role).map(r => (
                      <button
                        key={r}
                        onClick={() => doUpdateRole(m.email, r)}
                        className="w-full text-left px-4 py-2 text-sm hover:opacity-70 flex items-center gap-2"
                        style={{ color: "var(--color-text)" }}
                      >
                        {ROLE_ICONS[r]}
                        Make {r}
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid var(--color-border)", margin: "4px 0" }} />
                    <button
                      onClick={() => doRevoke(m.email)}
                      className="w-full text-left px-4 py-2 text-sm hover:opacity-70"
                      style={{ color: "var(--color-error)" }}
                    >
                      Revoke access
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
