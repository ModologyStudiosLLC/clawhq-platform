/**
 * ClawHQ license tier system.
 *
 * Self-hosted open-source: always "free" unless CLAWHQ_LICENSE_TIER is set.
 * Hosted cloud: tier is stored in WorkOS org metadata (clawhq_tier) and passed
 * via CLAWHQ_LICENSE_TIER at the worker level after subscription activation.
 *
 * Tier hierarchy: free < cloud < enterprise
 */

export type LicenseTier = "free" | "cloud" | "enterprise";

const TIER_RANK: Record<LicenseTier, number> = {
  free: 0,
  cloud: 1,
  enterprise: 2,
};

function resolveEnvTier(): LicenseTier {
  const raw = process.env.CLAWHQ_LICENSE_TIER?.toLowerCase();
  if (raw === "enterprise") return "enterprise";
  if (raw === "cloud" || raw === "pro") return "cloud";
  return "free";
}

export function getLicenseTier(): LicenseTier {
  return resolveEnvTier();
}

/** True if the current deployment's tier meets or exceeds `required`. */
export function hasFeature(required: LicenseTier): boolean {
  return TIER_RANK[getLicenseTier()] >= TIER_RANK[required];
}

export const FEATURES = {
  memberManagement: (tier: LicenseTier) => TIER_RANK[tier] >= TIER_RANK["cloud"],
  sso:              (tier: LicenseTier) => TIER_RANK[tier] >= TIER_RANK["enterprise"],
  rbac:             (tier: LicenseTier) => TIER_RANK[tier] >= TIER_RANK["enterprise"],
  auditLog:         (tier: LicenseTier) => TIER_RANK[tier] >= TIER_RANK["cloud"],
  agentSeatLimit:   (tier: LicenseTier): number => {
    if (TIER_RANK[tier] >= TIER_RANK["enterprise"]) return Infinity;
    if (TIER_RANK[tier] >= TIER_RANK["cloud"]) return 20;
    return 3;
  },
  memberSeatLimit:  (tier: LicenseTier): number => {
    if (TIER_RANK[tier] >= TIER_RANK["enterprise"]) return Infinity;
    if (TIER_RANK[tier] >= TIER_RANK["cloud"]) return 20;
    return 1;
  },
} as const;
