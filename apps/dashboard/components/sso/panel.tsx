"use client";

import { ExternalLink } from "lucide-react";

/**
 * SSOPanel — open-source stub.
 * WorkOS SSO configuration UI is provided by the clawhq-enterprise overlay.
 *   github.com/ModologyStudiosLLC/clawhq-enterprise
 */
export function SSOPanel() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "64px 32px",
        textAlign: "center",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
      }}
    >
      <div style={{ fontSize: 32 }}>🔐</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: "var(--color-text)" }}>
        Single Sign-On
      </div>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
        Configure SAML/OIDC SSO and WorkOS Directory Sync. Available on ClawHQ Enterprise
        plans via the clawhq-enterprise overlay.
      </p>
      <a
        href="mailto:hello@clawhqplatform.com?subject=Enterprise%20SSO"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "var(--color-accent)",
          color: "#050507",
          fontWeight: 700,
          fontSize: 13,
          padding: "10px 20px",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Contact us for Enterprise <ExternalLink size={13} />
      </a>
    </div>
  );
}
