// Reranks available tools by relevance to the current message using keyword + semantic scoring.
// Used by OpenClaw agents to trim the active toolset before sending to the model.
// Default: keep top N=15 tools (AGENT_SKILL_RERANKER_TOP_N env var).

export const RERANKER_TOP_N = parseInt(process.env.AGENT_SKILL_RERANKER_TOP_N ?? "15", 10);

export interface ToolEntry {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

/** Tokenize a string into lowercase words, stripping punctuation. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Score a tool's relevance to a message.
 * - +1 per query token that appears in the combined text (name + description + tags)
 * - +0.5 additional boost for each exact-word match (whole-word boundary)
 * Returns 0 for tools with no overlap.
 */
function scoreToolRelevance(tool: ToolEntry, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;

  const combined = [tool.name, tool.description, ...(tool.tags ?? [])].join(" ");
  const combinedLower = combined.toLowerCase();
  const toolTokens = new Set(tokenize(combined));

  let score = 0;
  for (const token of queryTokens) {
    if (toolTokens.has(token)) {
      score += 1;
      // Extra boost for exact whole-word match in combined text
      const wordBoundaryRe = new RegExp(`\\b${token.replace(/[-_]/g, "[-_]")}\\b`, "i");
      if (wordBoundaryRe.test(combinedLower)) {
        score += 0.5;
      }
    }
  }

  return score;
}

/**
 * Reranks and filters tools by relevance to the current user message.
 *
 * Tools tagged "core" or "required" are always included regardless of score.
 * The remaining slots (up to topN) are filled by the highest-scoring tools.
 *
 * @param tools   - Full list of available tool entries.
 * @param message - The current user message text.
 * @param topN    - Maximum number of tools to return. Defaults to RERANKER_TOP_N.
 * @returns       - Filtered and ordered list of tools (pinned first, then by score desc).
 */
export function rerankTools(
  tools: ToolEntry[],
  message: string,
  topN: number = RERANKER_TOP_N,
): ToolEntry[] {
  const queryTokens = tokenize(message);

  const pinned: ToolEntry[] = [];
  const candidates: ToolEntry[] = [];

  for (const tool of tools) {
    const isPinned =
      tool.tags?.includes("core") === true ||
      tool.tags?.includes("required") === true;
    if (isPinned) {
      pinned.push(tool);
    } else {
      candidates.push(tool);
    }
  }

  // How many non-pinned slots remain?
  const slotsRemaining = Math.max(0, topN - pinned.length);

  if (slotsRemaining === 0 || candidates.length === 0) {
    return pinned.slice(0, topN);
  }

  // Score and sort candidates
  const scored = candidates.map(tool => ({
    tool,
    score: scoreToolRelevance(tool, queryTokens),
  }));

  scored.sort((a, b) => b.score - a.score);

  const topCandidates = scored.slice(0, slotsRemaining).map(s => s.tool);

  return [...pinned, ...topCandidates];
}
