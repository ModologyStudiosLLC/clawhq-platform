"use client";

import { TeamDirectory } from "./directory";

/**
 * TeamPageClient — open-source version (single tab: AI Agents).
 * The Members tab and RBAC features are provided by the clawhq-enterprise overlay.
 *   github.com/ModologyStudiosLLC/clawhq-enterprise
 */
export function TeamPageClient() {
  return <TeamDirectory />;
}
