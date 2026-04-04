import { NextResponse } from "next/server";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";

function parsePrometheus(text: string) {
  const result: Record<string, number | Record<string, number>> = {};

  for (const line of text.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;

    // Lines like: openfang_agents_active 12
    // Or with labels: openfang_tokens_total{agent="collector-hand",provider="openrouter",model="google/gemini-2.5-flash"} 119120
    const labelMatch = line.match(/^(\w+)\{([^}]+)\}\s+([\d.]+)/);
    if (labelMatch) {
      const [, name, labelsStr, value] = labelMatch;
      if (!result[name]) result[name] = {};
      const labels: Record<string, string> = {};
      for (const part of labelsStr.split(",")) {
        const [k, v] = part.split("=");
        labels[k] = v.replace(/"/g, "");
      }
      // Use agent label as key if present
      const key = labels.agent || labelsStr;
      (result[name] as Record<string, number>)[key] = parseFloat(value);
      continue;
    }

    const simpleMatch = line.match(/^(\w+)\s+([\d.]+)/);
    if (simpleMatch) {
      result[simpleMatch[1]] = parseFloat(simpleMatch[2]);
    }
  }

  return result;
}

export async function GET() {
  try {
    const res = await fetch(`${OPENFANG}/api/metrics`, { next: { revalidate: 15 } });
    if (!res.ok) throw new Error(`${res.status}`);
    const text = await res.text();
    const parsed = parsePrometheus(text);
    return NextResponse.json(parsed);
  } catch {
    // Return empty metrics rather than 503 so the home page doesn't show "Service Offline"
    return NextResponse.json({});
  }
}
