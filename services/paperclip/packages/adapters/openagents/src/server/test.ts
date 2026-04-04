import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";

function resolveEnvRef(value: unknown, envFallback?: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return envFallback ? (process.env[envFallback] ?? "") : "";
  const match = s.match(/^\$\{([^}]+)\}$/);
  if (match) return process.env[match[1]] ?? "";
  return s;
}

function status(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((c) => c.level === "error")) return "fail";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "pass";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = ctx.config;

  const apiKey = resolveEnvRef(config.apiKey, "OPENAGENTS_API_KEY");
  const networkUrl = (
    resolveEnvRef(config.networkUrl) || "https://api.openagents.org/v1"
  ).replace(/\/$/, "");

  // ── API key check ───────────────────────────────────────────────────────────
  if (!apiKey) {
    checks.push({
      code: "openagents_api_key_missing",
      level: "error",
      message: "OpenAgents API key is not set.",
      hint:
        "Set apiKey in the agent config (use ${OPENAGENTS_API_KEY} to reference an env var) " +
        "or define OPENAGENTS_API_KEY in your environment. " +
        "Get a key at https://openagents.org",
    });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  const keyPrefix = apiKey.slice(0, 8) + "…";
  checks.push({
    code: "openagents_api_key_present",
    level: "info",
    message: `API key present (${keyPrefix})`,
  });

  // ── Network URL format check ────────────────────────────────────────────────
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(networkUrl);
  } catch {
    checks.push({
      code: "openagents_network_url_invalid",
      level: "error",
      message: `Invalid networkUrl: ${networkUrl}`,
      hint: "Must be a valid https:// URL.",
    });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    checks.push({
      code: "openagents_network_url_protocol",
      level: "error",
      message: `Unsupported protocol: ${parsedUrl.protocol}`,
      hint: "Use an https:// URL.",
    });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  checks.push({
    code: "openagents_network_url_ok",
    level: "info",
    message: `Network URL: ${networkUrl}`,
  });

  // ── Connectivity probe ──────────────────────────────────────────────────────
  //
  // We attempt a lightweight auth check against /auth/verify (or equivalent).
  // If the endpoint returns 401, that means the network is reachable but the
  // key is wrong — still useful info. A network error means connectivity issue.
  //
  // TODO: Confirm the correct healthcheck / auth-verify endpoint path once you
  // have an OpenAgents account. Replace /auth/verify with the real path.
  //
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const probeUrl = `${networkUrl}/auth/verify`;
    const res = await fetch(probeUrl, {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      checks.push({
        code: "openagents_api_key_invalid",
        level: "error",
        message: `OpenAgents API returned HTTP ${res.status} — API key is invalid or expired.`,
        hint: "Generate a new key at https://openagents.org under Settings → API Keys.",
      });
    } else if (res.ok || res.status === 404) {
      // 404 here likely means the probe path differs — network is reachable, which is what matters
      checks.push({
        code: "openagents_network_reachable",
        level: "info",
        message: `OpenAgents network is reachable (HTTP ${res.status}).`,
      });
    } else {
      checks.push({
        code: "openagents_network_unexpected",
        level: "warn",
        message: `OpenAgents probe returned HTTP ${res.status}.`,
        hint: "Verify the networkUrl and that the service is operational at https://openagents.org/status.",
      });
    }
  } catch (err) {
    clearTimeout(timer);
    const timedOut = (err as Error).name === "AbortError";
    checks.push({
      code: timedOut ? "openagents_probe_timeout" : "openagents_probe_failed",
      level: "warn",
      message: timedOut
        ? "OpenAgents network probe timed out (5s)."
        : `OpenAgents network probe failed: ${(err as Error).message}`,
      hint: timedOut
        ? "This may be a connectivity issue from the server. Runs may still work if the network is accessible at runtime."
        : "Check outbound HTTPS access from the host running Paperclip.",
    });
  } finally {
    clearTimeout(timer);
  }

  // ── Model check ─────────────────────────────────────────────────────────────
  const model = typeof config.model === "string" && config.model
    ? config.model : "claude-sonnet-4-6";
  checks.push({
    code: "openagents_model_configured",
    level: "info",
    message: `Configured model: ${model}`,
    detail: "Verify this model is enabled in your OpenAgents plan.",
  });

  // ── Agent handle ────────────────────────────────────────────────────────────
  const agentHandle = typeof config.agentHandle === "string" && config.agentHandle.trim()
    ? config.agentHandle.trim() : null;
  if (agentHandle) {
    checks.push({
      code: "openagents_handle_configured",
      level: "info",
      message: `Agent handle: ${agentHandle}`,
      detail: "This agent will be discoverable on the OpenAgents network under this handle.",
    });
  } else {
    checks.push({
      code: "openagents_handle_not_set",
      level: "info",
      message: "No agent handle set — agent will run anonymously (not visible to other network agents).",
      hint: "Set agentHandle to make this agent discoverable in the OpenAgents Workspace.",
    });
  }

  return {
    adapterType: ctx.adapterType,
    status: status(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
