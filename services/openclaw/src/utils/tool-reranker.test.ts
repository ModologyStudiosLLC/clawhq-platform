import { describe, expect, it } from "vitest";
import { rerankTools, RERANKER_TOP_N, type ToolEntry } from "./tool-reranker.js";

const TOOLS: ToolEntry[] = [
  { id: "web_search", name: "Web Search", description: "Search the web for information", tags: ["search", "web"] },
  { id: "code_exec", name: "Code Executor", description: "Run and execute Python or JavaScript code", tags: ["code", "exec"] },
  { id: "file_read", name: "File Reader", description: "Read files from the local filesystem", tags: ["file", "fs"] },
  { id: "calendar", name: "Calendar", description: "Create and manage calendar events and reminders", tags: ["calendar", "schedule"] },
  { id: "memory", name: "Memory Store", description: "Persistent key-value memory across sessions", tags: ["memory", "core"] },
  { id: "bash", name: "Bash Shell", description: "Execute shell commands in a bash terminal", tags: ["shell", "exec", "required"] },
  { id: "email", name: "Email", description: "Send and receive email messages via SMTP/IMAP", tags: ["email", "smtp"] },
  { id: "database", name: "Database", description: "Query and manage SQL databases", tags: ["sql", "db"] },
];

describe("rerankTools", () => {
  it("exports RERANKER_TOP_N as a number defaulting to 15", () => {
    expect(typeof RERANKER_TOP_N).toBe("number");
    expect(RERANKER_TOP_N).toBe(15);
  });

  it("always includes tools tagged 'core' or 'required' regardless of message relevance", () => {
    // Message is about email — completely unrelated to memory/bash
    const result = rerankTools(TOOLS, "send an email to my colleague", 3);
    const ids = result.map(t => t.id);
    // memory=core, bash=required must always appear
    expect(ids).toContain("memory");
    expect(ids).toContain("bash");
    // total should be capped at topN=3
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("returns tools ranked by relevance to the message", () => {
    const result = rerankTools(TOOLS, "search the web for latest news", 5);
    const ids = result.map(t => t.id);
    // web_search is most relevant; pinned tools also included
    expect(ids).toContain("web_search");
    expect(ids).toContain("memory");
    expect(ids).toContain("bash");
  });

  it("returns no more than topN tools", () => {
    const result = rerankTools(TOOLS, "run some code", 4);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("returns all pinned tools even when topN is smaller than pinned count", () => {
    // memory=core, bash=required — 2 pinned tools. topN=1 should still return 2 pinned.
    const result = rerankTools(TOOLS, "anything", 1);
    const ids = result.map(t => t.id);
    expect(ids).toContain("memory");
    expect(ids).toContain("bash");
    // pinned count wins
    expect(result.length).toBe(2);
  });

  it("returns an empty array when no tools are provided", () => {
    const result = rerankTools([], "run some code", 5);
    expect(result).toEqual([]);
  });

  it("scores exact keyword overlap higher than partial overlap", () => {
    const specificTools: ToolEntry[] = [
      { id: "sql_tool", name: "SQL Query", description: "Query SQL databases directly" },
      { id: "generic_db", name: "Database Manager", description: "General data storage tool" },
    ];
    const result = rerankTools(specificTools, "query sql database", 2);
    // sql_tool has multiple exact matches; it should appear first
    expect(result[0]?.id).toBe("sql_tool");
  });

  it("handles an empty message and returns only pinned tools plus first N candidates unsorted", () => {
    const result = rerankTools(TOOLS, "", 3);
    const ids = result.map(t => t.id);
    expect(ids).toContain("memory");
    expect(ids).toContain("bash");
    expect(result.length).toBeLessThanOrEqual(3);
  });
});
