/**
 * ClawHQ Pack Vetter
 *
 * Stateless, dependency-free YAML pack security checker.
 * Runs in both Cloudflare Workers (upload pre-flight) and Node.js (CLI).
 *
 * First-party checks (all packs):
 *   FAIL  — schema-required  : missing apiVersion / kind / name / version / description
 *   FAIL  — hardcoded-secret : API keys, tokens, or credentials found in pack text
 *   FAIL  — dangerous-no-hitl: high-risk tools declared without hitl enabled
 *   WARN  — external-url     : HTTP(S) URLs in task/instructions (data exfil risk)
 *   WARN  — semver           : version field is not valid semver
 *   WARN  — no-tags          : pack declares no tags (discoverability + audit trail)
 *   INFO  — tool-summary     : lists all tools the pack requests
 *
 * Third-party stricter checks (thirdParty: true, or publisher ≠ "clawhq"):
 *   FAIL  — tp-publisher     : publisher field must be present and not "clawhq"
 *   FAIL  — tp-contact       : contact or repository field required
 *   FAIL  — tp-external-url  : external URLs are a hard fail (not just a warning)
 *   FAIL  — tp-no-tags       : tags are required for third-party packs
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckLevel = "fail" | "warn" | "info";

export interface VetCheck {
  id: string;
  level: CheckLevel;
  message: string;
}

export interface VetResult {
  packId: string;
  status: "pass" | "warn" | "fail";
  checks: VetCheck[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Tools that require hitl to be enabled on any agent that declares them. */
const HIGH_RISK_TOOLS = new Set([
  "bash", "shell", "exec", "system_run",
  "fs_write", "fs_delete", "fs_move",
  "cron",
]);

/** Secret patterns to detect in pack text (task prompts, instructions, etc.). */
const SECRET_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "OpenAI key",      re: /sk-[A-Za-z0-9_-]{20,}/ },
  { label: "Anthropic key",   re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { label: "Slack token",     re: /xox[bpars]-[A-Za-z0-9-]{10,}/ },
  { label: "GitHub token",    re: /gh[ps]_[A-Za-z0-9]{36,}/ },
  { label: "AWS access key",  re: /AKIA[A-Z0-9]{16}/ },
  { label: "PEM block",       re: /-----BEGIN [A-Z ]+-----/ },
  { label: "password field",  re: /password\s*[:=]\s*\S{8,}/i },
  { label: "bearer token",    re: /bearer\s+[A-Za-z0-9_.-]{20,}/i },
];

const SEMVER_RE = /^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?(\+[A-Za-z0-9.-]+)?$/;
const REQUIRED_API_VERSION = "paperclip.ai/v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extract(yaml: string, key: string): string | null {
  const m = yaml.match(new RegExp(`^\\s*${key}:\\s*(.+)`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

function extractAll(yaml: string, key: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`^\\s*${key}:\\s*(.+)`, "gm");
  let m: RegExpExecArray | null;
  while ((m = re.exec(yaml)) !== null) {
    results.push(m[1].trim().replace(/^["']|["']$/g, ""));
  }
  return results;
}

/** Collect all values from inline YAML lists: `tools: [bash, exec]` */
function extractToolLists(yaml: string): string[] {
  const tools: string[] = [];
  const listRe = /tools:\s*\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(yaml)) !== null) {
    m[1].split(",").forEach(t => {
      const trimmed = t.trim().replace(/^["']|["']$/g, "");
      if (trimmed) tools.push(trimmed);
    });
  }
  // Also catch multi-line list items: `  - bash`
  const itemRe = /^[ \t]*-[ \t]+([\w-]+)[ \t]*$/gm;
  while ((m = itemRe.exec(yaml)) !== null) {
    tools.push(m[1]);
  }
  return [...new Set(tools)];
}

/** True if the pack has at least one `hitl: true` or `hitl:\n  enabled: true` */
function hasHitlEnabled(yaml: string): boolean {
  // Inline: `hitl: true`
  if (/hitl\s*:\s*true/i.test(yaml)) return true;
  // Block: `hitl:\n  enabled: true`
  if (/hitl\s*:\s*\n\s+enabled\s*:\s*true/i.test(yaml)) return true;
  return false;
}

/** Extract all URLs from task/instructions text. */
function extractUrls(yaml: string): string[] {
  const urls: string[] = [];
  const re = /https?:\/\/[^\s"'<>)]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(yaml)) !== null) {
    urls.push(m[0]);
  }
  return [...new Set(urls)];
}

// ── Vetter ────────────────────────────────────────────────────────────────────

export interface VetOptions {
  /**
   * Force third-party mode regardless of the publisher field.
   * Use this when accepting packs from community submission endpoints.
   * First-party uploads (via admin token) should leave this false.
   */
  thirdParty?: boolean;
}

export function vetPack(packId: string, yaml: string, opts: VetOptions = {}): VetResult {
  const checks: VetCheck[] = [];

  // ── Schema checks ──────────────────────────────────────────────────────────

  const apiVersion = extract(yaml, "apiVersion");
  if (apiVersion !== REQUIRED_API_VERSION) {
    checks.push({
      id: "schema-apiVersion",
      level: "fail",
      message: `apiVersion must be "${REQUIRED_API_VERSION}", got "${apiVersion ?? "(missing)"}"`,
    });
  }

  const kind = extract(yaml, "kind");
  if (kind !== "AgentPack") {
    checks.push({
      id: "schema-kind",
      level: "fail",
      message: `kind must be "AgentPack", got "${kind ?? "(missing)"}"`,
    });
  }

  const name = extract(yaml, "name");
  if (!name) {
    checks.push({ id: "schema-name", level: "fail", message: "metadata.name is required" });
  }

  const version = extract(yaml, "version");
  if (!version) {
    checks.push({ id: "schema-version", level: "fail", message: "metadata.version is required" });
  } else if (!SEMVER_RE.test(version)) {
    checks.push({
      id: "semver",
      level: "warn",
      message: `version "${version}" is not valid semver (e.g. "1.0.0")`,
    });
  }

  const description = extractAll(yaml, "description");
  if (description.length === 0) {
    checks.push({ id: "schema-description", level: "fail", message: "metadata.description is required" });
  }

  // ── Secret detection ───────────────────────────────────────────────────────

  for (const { label, re } of SECRET_PATTERNS) {
    if (re.test(yaml)) {
      checks.push({
        id: "hardcoded-secret",
        level: "fail",
        message: `Possible hardcoded secret detected (${label}) — remove credentials from pack YAML`,
      });
    }
  }

  // ── Dangerous tools without hitl ───────────────────────────────────────────

  const allTools = extractToolLists(yaml);
  const riskyTools = allTools.filter(t => HIGH_RISK_TOOLS.has(t));
  if (riskyTools.length > 0 && !hasHitlEnabled(yaml)) {
    checks.push({
      id: "dangerous-no-hitl",
      level: "fail",
      message: `Pack declares high-risk tool(s) [${riskyTools.join(", ")}] but does not enable hitl. ` +
        `Add \`settings.hitl.enabled: true\` or set \`hitl: true\` on each agent using these tools.`,
    });
  }

  // ── External URLs ──────────────────────────────────────────────────────────

  const urls = extractUrls(yaml);
  if (urls.length > 0) {
    checks.push({
      id: "external-url",
      level: "warn",
      message: `Pack references ${urls.length} external URL(s) in prompts — ` +
        `verify these are intentional and not data exfiltration vectors: ${urls.slice(0, 3).join(", ")}${urls.length > 3 ? " …" : ""}`,
    });
  }

  // ── Tags ───────────────────────────────────────────────────────────────────

  if (!/tags\s*:\s*\[/.test(yaml) && !/tags\s*:\s*\n/.test(yaml)) {
    checks.push({ id: "no-tags", level: "warn", message: "No tags defined — add tags for discoverability and filtering" });
  }

  // ── Tool summary (info) ────────────────────────────────────────────────────

  if (allTools.length > 0) {
    checks.push({
      id: "tool-summary",
      level: "info",
      message: `Pack requests tools: [${[...new Set(allTools)].join(", ")}]`,
    });
  }

  // ── Third-party stricter checks ────────────────────────────────────────────

  const isThirdParty = opts.thirdParty === true || isThirdPartyPack(yaml);
  if (isThirdParty) {
    runThirdPartyChecks(yaml, checks);
  }

  // ── Final status ───────────────────────────────────────────────────────────

  const status = checks.some(c => c.level === "fail")
    ? "fail"
    : checks.some(c => c.level === "warn")
    ? "warn"
    : "pass";

  return { packId, status, checks };
}

// ── Third-party vetting ───────────────────────────────────────────────────────

const FIRST_PARTY_PUBLISHERS = new Set(["clawhq", "clawhq-labs", ""]);

/** Returns true if the pack YAML identifies as third-party based on the publisher field. */
function isThirdPartyPack(yaml: string): boolean {
  const publisher = extract(yaml, "publisher") ?? "";
  return !FIRST_PARTY_PUBLISHERS.has(publisher.toLowerCase().trim());
}

function runThirdPartyChecks(yaml: string, checks: VetCheck[]): void {
  const publisher = extract(yaml, "publisher");
  if (!publisher) {
    checks.push({
      id: "tp-publisher",
      level: "fail",
      message: 'Third-party packs must declare metadata.publisher (e.g. "publisher: acme-corp")',
    });
  } else if (FIRST_PARTY_PUBLISHERS.has(publisher.toLowerCase().trim())) {
    checks.push({
      id: "tp-publisher",
      level: "fail",
      message: `Third-party packs cannot claim publisher "${publisher}" — that is reserved for ClawHQ`,
    });
  }

  const hasContact = /contact\s*:\s*\S+/.test(yaml);
  const hasRepo = /repository\s*:\s*\S+/.test(yaml);
  if (!hasContact && !hasRepo) {
    checks.push({
      id: "tp-contact",
      level: "fail",
      message: "Third-party packs must include metadata.contact (email) or metadata.repository (URL) for accountability",
    });
  }

  // External URLs are a hard fail for third-party (WARN for first-party)
  const urls = extractUrls(yaml);
  if (urls.length > 0) {
    // Upgrade the existing external-url WARN to a FAIL by replacing it
    const warnIdx = checks.findIndex(c => c.id === "external-url");
    const msg = `Third-party pack references external URLs — remove or move to metadata.repository: ${urls.slice(0, 3).join(", ")}${urls.length > 3 ? " …" : ""}`;
    if (warnIdx >= 0) {
      checks[warnIdx] = { id: "tp-external-url", level: "fail", message: msg };
    } else {
      checks.push({ id: "tp-external-url", level: "fail", message: msg });
    }
  }

  // Tags are required for third-party
  const hasTagsWarn = checks.find(c => c.id === "no-tags");
  if (hasTagsWarn) {
    checks.splice(checks.indexOf(hasTagsWarn), 1, {
      id: "tp-no-tags",
      level: "fail",
      message: "Third-party packs must declare tags for filtering and audit",
    });
  }
}

// ── Vetter (updated signature) ────────────────────────────────────────────────

/** Format a VetResult for human-readable CLI output. */
export function formatVetResult(result: VetResult): string {
  const icon = result.status === "fail" ? "✗" : result.status === "warn" ? "⚠" : "✓";
  const lines: string[] = [`${icon} ${result.packId} [${result.status.toUpperCase()}]`];

  for (const c of result.checks) {
    const prefix = c.level === "fail" ? "  FAIL" : c.level === "warn" ? "  WARN" : "  INFO";
    lines.push(`${prefix}  ${c.message}`);
  }

  if (result.checks.length === 0) {
    lines.push("  All checks passed.");
  }

  return lines.join("\n");
}
