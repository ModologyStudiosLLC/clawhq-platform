import { NextResponse } from "next/server";

// Natural language → proposed settings change
// Calls Hermes internal API or falls back to direct Anthropic call
export async function POST(req: Request) {
  const { prompt, currentSettings } = await req.json();

  const hermesUrl = process.env.HERMES_INTERNAL_URL;
  if (!hermesUrl) {
    return NextResponse.json({ error: "Hermes not configured" }, { status: 503 });
  }

  const systemPrompt = `You are a ClawHQ settings assistant. The user will describe a change they want to make to their agent settings in natural language. You must return ONLY a valid JSON object representing the partial settings diff to apply (matching the ClawHQ settings schema). Never include explanation — only JSON.

ClawHQ settings schema:
{
  securityLevel: 0 (Locked) | 1 (Balanced) | 2 (Open) | 3 (DevMode),
  monthlyBudgetCents: number (e.g. 5000 = $50/month),
  budgetUnlimited: boolean,
  budgetAlertPercent: number (0-100),
  agents: {
    hermes: { model: "claude-haiku-4-5-20251001"|"claude-sonnet-4-6"|"claude-opus-4-6", tools: {web_search,code_exec,memory,calendar: boolean}, schedule: string (cron or "") },
    openfang: { model: "...", tools: {bash,file_write,browser,code_exec: boolean}, schedule: string }
  }
}

Current settings: ${JSON.stringify(currentSettings)}

Respond with ONLY the JSON diff, nothing else.`;

  try {
    const res = await fetch(`${hermesUrl}/api/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
      }),
    });

    if (!res.ok) throw new Error(`Hermes returned ${res.status}`);
    const data = await res.json();
    const text = data.content ?? data.text ?? data.choices?.[0]?.message?.content ?? "";

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const diff = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ diff, raw: text });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
