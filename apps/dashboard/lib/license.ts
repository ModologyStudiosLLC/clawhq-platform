/**
 * ClawHQ license tier system — open-source stub.
 *
 * This file always returns the "free" tier.
 * Pro and Enterprise features are provided by the clawhq-enterprise overlay:
 *   github.com/ModologyStudiosLLC/clawhq-enterprise
 *
 * To unlock Pro/Enterprise features, install the overlay and set
 * CLAWHQ_LICENSE_TIER=pro or CLAWHQ_LICENSE_TIER=enterprise in your .env.
 */

export type LicenseTier = "free" | "pro" | "enterprise";

export function getLicenseTier(): LicenseTier {
  return "free";
}

export function hasFeature(_required: LicenseTier): boolean {
  return false;
}

export const FEATURES = {
  memberManagement: (_tier: LicenseTier) => false,
  sso: (_tier: LicenseTier) => false,
  rbac: (_tier: LicenseTier) => false,
  auditLog: (_tier: LicenseTier) => false,
  agentSeatLimit: (_tier: LicenseTier): number => 3,
  memberSeatLimit: (_tier: LicenseTier): number => 1,
} as const;
