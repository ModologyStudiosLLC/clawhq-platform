/**
 * ClawHQ license tier system.
 *
 * Tier is controlled by CLAWHQ_LICENSE_TIER env var:
 *   "free"       — self-hosted, single user, no SSO/RBAC
 *   "pro"        — self-hosted, up to 5 users, packs enabled
 *   "enterprise" — SSO, RBAC, audit log, unlimited members, priority support
 *
 * For MSP white-label deployments, set CLAWHQ_LICENSE_TIER=enterprise
 * and NEXT_PUBLIC_TENANT_POWERED_BY=false.
 */

export type LicenseTier = "free" | "pro" | "enterprise";

const TIER_ORDER: Record<LicenseTier, number> = { free: 0, pro: 1, enterprise: 2 };

export function getLicenseTier(): LicenseTier {
  const raw = (process.env.CLAWHQ_LICENSE_TIER ?? "free").toLowerCase();
  if (raw === "pro") return "pro";
  if (raw === "enterprise") return "enterprise";
  return "free";
}

/** Returns true if the current license is at least the required tier. */
export function hasFeature(required: LicenseTier): boolean {
  return TIER_ORDER[getLicenseTier()] >= TIER_ORDER[required];
}

/** Feature flags — what each tier unlocks. */
export const FEATURES = {
  /** Human member invitations and role management. */
  memberManagement: (tier: LicenseTier) => TIER_ORDER[tier] >= TIER_ORDER["pro"],
  /** WorkOS SSO connections. */
  sso: (tier: LicenseTier) => TIER_ORDER[tier] >= TIER_ORDER["enterprise"],
  /** Role-based access control (requireRole guards). */
  rbac: (tier: LicenseTier) => TIER_ORDER[tier] >= TIER_ORDER["enterprise"],
  /** Audit log access. */
  auditLog: (tier: LicenseTier) => TIER_ORDER[tier] >= TIER_ORDER["pro"],
  /** Unlimited agent seats (free = 3, pro = 25, enterprise = unlimited). */
  agentSeatLimit: (tier: LicenseTier): number =>
    tier === "enterprise" ? Infinity : tier === "pro" ? 25 : 3,
  /** Member seat limit (free = 1, pro = 5, enterprise = unlimited). */
  memberSeatLimit: (tier: LicenseTier): number =>
    tier === "enterprise" ? Infinity : tier === "pro" ? 5 : 1,
} as const;
