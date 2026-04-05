import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  category: "integration" | "kit" | "capability" | "agent" | "workflow";
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  priority: "high" | "medium";
}

// ── Simple in-memory cache (5 min TTL) ───────────────────────────────────────

let cache: { ts: number; data: Recommendation[] } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Context gathering ─────────────────────────────────────────────────────────

async function gatherContext() {
  const integrationsFile =
    process.env.CLAWHQ_INTEGRATIONS_FILE ??
    path.join(homedir(), ".clawhq", "integrations.json");

  const openclawFile =
    process.env.OPENCLAW_CONFIG_PATH ??
    path.join(homedir(), ".openclaw", "openclaw.json");

  let integrations: Record<string, { enabled: boolean; credential?: string }> = {};
  let openclawConfig: Record<string, unknown> = {};

  try {
    integrations = JSON.parse(await readFile(integrationsFile, "utf8"));
  } catch { /* not configured yet */ }

  try {
    openclawConfig = JSON.parse(await readFile(openclawFile, "utf8"));
  } catch { /* not configured yet */ }

  const enabledIntegrations = Object.entries(integrations)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k);

  const disabledIntegrations = Object.entries(integrations)
    .filter(([, v]) => !v.enabled)
    .map(([k]) => k);

  const agentList: unknown[] = (openclawConfig as any)?.agents?.list ?? [];
  const mcpServers = Object.keys((openclawConfig as any)?.mcp?.servers ?? {});
  const hasApiKey = !!(openclawConfig as any)?.config?.model?.apiKey ||
    !!(process.env.ANTHROPIC_API_KEY);

  return {
    enabledIntegrations,
    disabledIntegrations,
    agentCount: agentList.length,
    mcpServers,
    hasApiKey,
    allKnownIntegrations: [
      "github", "linear", "slack", "notion", "postgres",
      "brave-search", "filesystem", "memory", "google-drive",
      "fetch", "puppeteer", "sequential-thinking", "obsidian", "cloudflare",
    ],
  };
}

// ── Resolve best available LLM credentials ───────────────────────────────────

async function resolveLLM(): Promise<
  | { provider: "anthropic"; apiKey: string }
  | { provider: "openai-compat"; apiKey: string; baseUrl: string; model: string }
  | null
> {
  // 1. Anthropic env var (highest priority)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };

  // 2. Read openclaw.json for configured providers (DeepSeek, etc.)
  try {
    const openclawFile =
      process.env.OPENCLAW_CONFIG_PATH ??
      path.join(homedir(), ".openclaw", "openclaw.json");
    const raw = await readFile(openclawFile, "utf8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    const providers = (config as any)?.models?.providers as Record<string, { apiKey?: string; baseUrl?: string; models?: Array<string | { id: string }> }> | undefined;
    if (providers) {
      // Try DeepSeek first (best OSS model for structured JSON)
      for (const [name, p] of Object.entries(providers)) {
        if (p?.apiKey && p.apiKey !== "metaclaw" && p?.baseUrl) {
          const rawModel = p.models?.[0];
          const model = typeof rawModel === "string" ? rawModel
            : rawModel?.id ?? (name === "deepseek" ? "deepseek-chat" : "gpt-3.5-turbo");
          return { provider: "openai-compat", apiKey: p.apiKey, baseUrl: p.baseUrl, model };
        }
      }
    }
  } catch { /* no config */ }

  return null;
}

// ── LLM call — tries Anthropic then OpenAI-compat providers ─────────────────

async function generateWithLLM(ctx: Awaited<ReturnType<typeof gatherContext>>): Promise<Recommendation[]> {
  const llm = await resolveLLM();
  if (!llm) throw new Error("No LLM provider configured");

  const notYetEnabled = ctx.allKnownIntegrations.filter(
    (i) => !ctx.enabledIntegrations.includes(i)
  );

  const systemPrompt = `You are a setup advisor for ClawHQ, an AI agent management platform.
Generate exactly 4 personalized, actionable recommendations based on the user's current setup.
Return ONLY a JSON array with no markdown, no explanation, just the array.
Each object must have: id (slug), category (integration|kit|capability|agent|workflow), icon (single emoji), title (≤8 words), description (≤20 words, specific and concrete), cta (≤4 words), href (one of: /settings, /integrations, /capabilities, /team, /packs, /chat), priority (high|medium).
Make recommendations feel smart and specific — reference actual integration names. Mix categories.`;

  const userPrompt = `Current setup:
- Enabled integrations: ${ctx.enabledIntegrations.length > 0 ? ctx.enabledIntegrations.join(", ") : "none"}
- Not yet enabled: ${notYetEnabled.slice(0, 8).join(", ")}
- Active MCP servers: ${ctx.mcpServers.length} (${ctx.mcpServers.slice(0, 4).join(", ")})
- Agents configured: ${ctx.agentCount}

Generate 4 recommendations. If no integrations are enabled, first suggestion should be enabling github or slack. If agents exist but no integrations, suggest the most useful integrations for those agents.`;

  let responseText: string;

  if (llm.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": llm.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    responseText = data.content.find((c) => c.type === "text")?.text ?? "[]";
  } else {
    // OpenAI-compatible (DeepSeek, etc.)
    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.model,
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`LLM API ${res.status}: ${await res.text()}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    responseText = data.choices[0]?.message?.content ?? "[]";
  }

  const cleaned = responseText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(cleaned) as Recommendation[];
}

// ── Fallback rules-based recommendations ─────────────────────────────────────

function fallbackRecommendations(ctx: Awaited<ReturnType<typeof gatherContext>>): Recommendation[] {
  const recs: Recommendation[] = [];

  if (ctx.agentCount === 0) {
    recs.push({
      id: "add-first-agent",
      category: "agent",
      icon: "🤖",
      title: "Create your first agent",
      description: "Add a Claude or GPT-4 agent to start automating tasks.",
      cta: "Add agent",
      href: "/team",
      priority: "high",
    });
  }

  if (!ctx.enabledIntegrations.includes("github")) {
    recs.push({
      id: "enable-github",
      category: "integration",
      icon: "🐙",
      title: "Connect GitHub",
      description: "Let agents read repos, open issues, and review PRs.",
      cta: "Enable",
      href: "/settings",
      priority: "high",
    });
  }

  if (!ctx.enabledIntegrations.includes("slack")) {
    recs.push({
      id: "enable-slack",
      category: "integration",
      icon: "💬",
      title: "Connect Slack",
      description: "Agents can send messages and monitor channels for you.",
      cta: "Enable",
      href: "/settings",
      priority: ctx.enabledIntegrations.length === 0 ? "high" : "medium",
    });
  }

  if (ctx.mcpServers.length === 0) {
    recs.push({
      id: "enable-mcp",
      category: "capability",
      icon: "⚡",
      title: "Enable MCP capabilities",
      description: "Give agents tools like web search, memory, and filesystem access.",
      cta: "Browse",
      href: "/capabilities",
      priority: "medium",
    });
  }

  if (!ctx.hasApiKey) {
    recs.push({
      id: "add-api-key",
      category: "agent",
      icon: "🔑",
      title: "Add your API key",
      description: "Connect Anthropic or OpenAI to power your agents.",
      cta: "Go to Settings",
      href: "/settings",
      priority: "high",
    });
  }

  recs.push({
    id: "explore-packs",
    category: "kit",
    icon: "📦",
    title: "Explore workflow kits",
    description: "Install pre-built agent workflows from the Journey registry.",
    cta: "Browse kits",
    href: "/packs",
    priority: "medium",
  });

  return recs.slice(0, 4);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bust = searchParams.get("bust") === "1";

  if (!bust && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ recommendations: cache.data, source: "cache" });
  }

  const ctx = await gatherContext();

  let recommendations: Recommendation[];
  let source: string;

  try {
    recommendations = await generateWithLLM(ctx);
    source = "llm";
  } catch (err) {
    console.warn("[recommendations] LLM unavailable, using fallback:", err instanceof Error ? err.message : err);
    recommendations = fallbackRecommendations(ctx);
    source = "fallback";
  }

  cache = { ts: Date.now(), data: recommendations };
  return NextResponse.json({ recommendations, source });
}
