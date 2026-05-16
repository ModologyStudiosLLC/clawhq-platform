/**
 * Dispatches an inbound Slack app_mention to a ClawHQ agent and posts the
 * result back to the originating thread.
 *
 * Parsing rules:
 *   @ClawHQ [AgentName] task text   → dispatch to named agent
 *   @ClawHQ task text               → dispatch to default running agent
 */

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || "http://localhost:4200";

export interface SlackMentionEvent {
  type: "app_mention";
  user: string;
  text: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  event_ts?: string;
}

interface Agent {
  id: string;
  name: string;
  state: string;
}

// Strip bot mention tokens and parse optional [AgentName] prefix.
function parseTask(text: string): { task: string; agentName?: string } {
  const stripped = text.replace(/<@[A-Z0-9]+>\s*/g, "").trim();

  const agentMatch = stripped.match(/^\[([^\]]+)\]\s*([\s\S]*)/);
  if (agentMatch) {
    return { agentName: agentMatch[1].trim(), task: agentMatch[2].trim() };
  }

  return { task: stripped };
}

async function findAgent(agentName?: string): Promise<Agent | null> {
  const res = await fetch(`${OPENFANG}/api/agents`, { cache: "no-store" });
  if (!res.ok) return null;
  const agents: Agent[] = await res.json().catch(() => []);

  if (agentName) {
    const lower = agentName.toLowerCase();
    const exact = agents.find(
      (a) => a.name.toLowerCase() === lower || a.id === agentName,
    );
    if (exact) return exact;
    const fuzzy = agents.find((a) => a.name.toLowerCase().includes(lower));
    if (fuzzy) return fuzzy;
  }

  return agents.find((a) => a.state === "Running") ?? null;
}

async function runTask(agentId: string, task: string): Promise<string> {
  const sessionRes = await fetch(`${OPENFANG}/api/agents/${agentId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!sessionRes.ok) {
    throw new Error(`Failed to create session: HTTP ${sessionRes.status}`);
  }
  const sessionData = (await sessionRes.json()) as Record<string, unknown>;
  const sid = (sessionData.session_id ?? sessionData.id) as string;

  const msgRes = await fetch(`${OPENFANG}/api/agents/${agentId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, message: task }),
  });
  if (!msgRes.ok) {
    throw new Error(`Agent message failed: HTTP ${msgRes.status}`);
  }
  const data = (await msgRes.json()) as Record<string, unknown>;
  return (
    (data.content ?? data.message ?? data.response ?? JSON.stringify(data)) as string
  );
}

async function postSlackReply(
  token: string,
  channel: string,
  threadTs: string,
  text: string,
): Promise<void> {
  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, thread_ts: threadTs, text }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // best-effort — if Slack is unreachable we can't do much
  }
}

export async function slackAgentDispatch(
  event: SlackMentionEvent,
  botToken: string,
): Promise<void> {
  const replyTs = event.thread_ts ?? event.ts;
  const { task, agentName } = parseTask(event.text);

  if (!task) {
    await postSlackReply(
      botToken,
      event.channel,
      replyTs,
      "No task found. Usage: `@ClawHQ [AgentName] your task` or `@ClawHQ your task`",
    );
    return;
  }

  let agent: Agent | null = null;
  try {
    agent = await findAgent(agentName);
  } catch {
    await postSlackReply(
      botToken,
      event.channel,
      replyTs,
      "Could not reach ClawHQ agent runtime. Check the dashboard.",
    );
    return;
  }

  if (!agent) {
    const hint = agentName ? ` No agent matched "${agentName}".` : "";
    await postSlackReply(
      botToken,
      event.channel,
      replyTs,
      `No running agent found.${hint} Check the ClawHQ dashboard.`,
    );
    return;
  }

  try {
    const result = await runTask(agent.id, task);
    await postSlackReply(
      botToken,
      event.channel,
      replyTs,
      `*${agent.name}:* ${result}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await postSlackReply(
      botToken,
      event.channel,
      replyTs,
      `Agent error: ${msg}`,
    );
  }
}
