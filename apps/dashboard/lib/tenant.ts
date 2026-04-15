/**
 * tenant.ts — white-label configuration for MSP deployments
 *
 * MSPs set these in their docker-compose.yml environment block.
 * Defaults produce standard ClawHQ branding.
 *
 * Example docker-compose.yml env block for MSP:
 *   NEXT_PUBLIC_TENANT_NAME=AcmeMSP AI
 *   NEXT_PUBLIC_TENANT_COMPANY=Acme Managed Services
 *   NEXT_PUBLIC_TENANT_ACCENT=#6366F1
 *   NEXT_PUBLIC_TENANT_SUPPORT_EMAIL=support@acmemsp.com
 *   NEXT_PUBLIC_TENANT_POWERED_BY=true
 */

export interface TenantConfig {
  /** Product name shown in UI (e.g. "AcmeMSP AI") */
  name: string;
  /** Company/brand name shown under logo (e.g. "Acme MSP") */
  company: string;
  /** Optional URL to custom logo image — shown instead of claw SVG if set */
  logoUrl: string | null;
  /** CSS hex color for primary accent — overrides --color-primary when set */
  accentColor: string | null;
  /** Support email for user-facing messages */
  supportEmail: string;
  /** Show "Powered by ClawHQ" in footer — MSPs may hide for white-label */
  poweredBy: boolean;
  /** Abbreviated name for header/browser title (e.g. "AcmeMSP") */
  shortName: string;
}

function env(key: string): string | undefined {
  return process.env[key] ?? undefined;
}

const raw = {
  name:         env("NEXT_PUBLIC_TENANT_NAME")         ?? "ClawHQ",
  company:      env("NEXT_PUBLIC_TENANT_COMPANY")      ?? "Modology Studios",
  logoUrl:      env("NEXT_PUBLIC_TENANT_LOGO_URL")     ?? null,
  accentColor:  env("NEXT_PUBLIC_TENANT_ACCENT")       ?? null,
  supportEmail: env("NEXT_PUBLIC_TENANT_SUPPORT_EMAIL")?? "hello@clawhqplatform.com",
  poweredBy:    env("NEXT_PUBLIC_TENANT_POWERED_BY") !== "false",
  shortName:    env("NEXT_PUBLIC_TENANT_SHORT_NAME")   ?? null,
};

export const tenant: TenantConfig = {
  name:         raw.name,
  company:      raw.company,
  logoUrl:      raw.logoUrl,
  accentColor:  raw.accentColor,
  supportEmail: raw.supportEmail,
  poweredBy:    raw.poweredBy,
  shortName:    raw.shortName ?? raw.name.split(" ")[0],
};

/** CSS snippet to inject accent override — empty string if not set */
export function tenantAccentCSS(): string {
  if (!tenant.accentColor) return "";
  // Simple hex to approx rgba for dim variant (25% opacity)
  const hex = tenant.accentColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `
    :root {
      --color-primary: ${tenant.accentColor};
      --color-primary-dim: rgba(${r},${g},${b},0.12);
      --color-primary-border: rgba(${r},${g},${b},0.25);
    }
  `.trim();
}
