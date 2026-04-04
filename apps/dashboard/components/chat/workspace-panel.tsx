"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, ChevronRight, X, RefreshCw, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  modified: number;
  dir: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDir(files: WorkspaceFile[]): Record<string, WorkspaceFile[]> {
  const groups: Record<string, WorkspaceFile[]> = {};
  for (const f of files) {
    const key = f.dir === "." ? "root" : f.dir;
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  return groups;
}

export function WorkspacePanel({ agentName }: { agentName: string }) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [viewing, setViewing] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFiles = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/workspace/${encodeURIComponent(agentName)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentName]);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(() => fetchFiles(true), 10_000);
    return () => clearInterval(interval);
  }, [fetchFiles]);

  async function openFile(file: WorkspaceFile) {
    const res = await fetch(
      `/api/workspace/${encodeURIComponent(agentName)}/file?path=${encodeURIComponent(file.path)}`
    );
    if (res.ok) {
      const data = await res.json();
      setViewing({ path: file.path, content: data.content });
    }
  }

  const groups = groupByDir(files);

  return (
    <div
      className="flex flex-col border-l overflow-hidden"
      style={{
        width: "272px",
        minWidth: "272px",
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-1.5">
          <FolderOpen size={13} style={{ color: "var(--color-text-muted)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--color-text)", fontFamily: var(--font-display) }}>
            Workspace
          </span>
          {files.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
            >
              {files.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchFiles(true)}
          className="p-1 rounded"
          style={{ color: "var(--color-text-muted)" }}
          title="Refresh"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* File viewer or file list */}
      {viewing ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Viewer header */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <button
              onClick={() => setViewing(null)}
              className="p-0.5 rounded flex-shrink-0"
              style={{ color: "var(--color-text-muted)" }}
            >
              <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} />
            </button>
            <span
              className="text-xs truncate font-mono flex-1 min-w-0"
              style={{ color: "var(--color-text-muted)" }}
              title={viewing.path}
            >
              {viewing.path}
            </span>
            <button onClick={() => setViewing(null)} style={{ color: "var(--color-text-muted)" }}>
              <X size={12} />
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {viewing.path.endsWith(".md") ? (
              <div
                className="text-xs leading-relaxed prose-sm"
                style={{ color: "var(--color-text)" }}
              >
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-sm font-bold mb-2" style={{ color: "var(--color-text)" }}>{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xs font-semibold mb-1.5 mt-3" style={{ color: "var(--color-text)" }}>{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-semibold mb-1 mt-2" style={{ color: "var(--color-text-muted)" }}>{children}</h3>,
                    p: ({ children }) => <p className="mb-2 text-xs leading-relaxed" style={{ color: "var(--color-text)" }}>{children}</p>,
                    ul: ({ children }) => <ul className="pl-3 mb-2 space-y-0.5" style={{ listStyleType: "disc" }}>{children}</ul>,
                    ol: ({ children }) => <ol className="pl-3 mb-2 space-y-0.5" style={{ listStyleType: "decimal" }}>{children}</ol>,
                    li: ({ children }) => <li className="text-xs" style={{ color: "var(--color-text)" }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>{children}</strong>,
                    code: ({ children }) => (
                      <code
                        className="text-xs px-1 py-0.5 rounded font-mono"
                        style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}
                      >
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre
                        className="text-xs p-2 rounded overflow-x-auto mb-2 font-mono"
                        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                      >
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {viewing.content}
                </ReactMarkdown>
              </div>
            ) : (
              <pre
                className="text-xs font-mono whitespace-pre-wrap break-words"
                style={{ color: "var(--color-text)" }}
              >
                {viewing.content}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
              <FolderOpen size={20} className="mb-2" style={{ color: "var(--color-text-subtle)" }} />
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No output files yet</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>Files appear here as the agent works</p>
            </div>
          ) : (
            <div className="py-1">
              {Object.entries(groups).map(([dir, groupFiles]) => (
                <div key={dir}>
                  {dir !== "root" && (
                    <div
                      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--color-text-subtle)", fontSize: "9px" }}
                    >
                      {dir}
                    </div>
                  )}
                  {groupFiles.map(file => (
                    <button
                      key={file.path}
                      onClick={() => openFile(file)}
                      className="w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                      <FileText size={12} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate font-medium" style={{ color: "var(--color-text)" }}>
                          {file.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)", fontSize: "10px" }}>
                          {formatSize(file.size)} · {timeAgo(file.modified)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
