import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readLog, type AuditEntry } from "../route";

const client = new Anthropic();

function formatEntryForContext(e: AuditEntry): string {
  const time = new Date(e.ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const diff = e.diff ? ` | diff: ${JSON.stringify(e.diff)}` : "";
  return `[${time}] ${e.actor} · ${e.action} · ${e.detail}${diff}`;
}

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const entries = await readLog();
  const recentEntries = entries.slice(-300);

  const logText = recentEntries.length > 0
    ? recentEntries.map(formatEntryForContext).join("\n")
    : "(no audit log entries yet)";

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `You are an audit log analyst for ClawHQ, an AI agent control plane.
You answer questions about what happened in the system based on audit log entries.
Rules:
- Answer directly and concisely in 1-4 sentences.
- Reference specific times, actors, and actions from the log when relevant.
- If the log doesn't contain enough information to answer, say so plainly.
- Do not invent events that aren't in the log.`,
    messages: [
      {
        role: "user",
        content: `AUDIT LOG (most recent ${recentEntries.length} entries):\n${logText}\n\nQUESTION: ${question}`,
      },
    ],
  });

  const answer = (msg.content[0] as { text: string }).text;
  return NextResponse.json({ answer, entryCount: recentEntries.length });
}
