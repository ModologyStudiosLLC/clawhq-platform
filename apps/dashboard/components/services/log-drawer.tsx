"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Download } from "lucide-react";

interface LogLine {
  stream: "stdout" | "stderr";
  line: string;
}

interface LogDrawerProps {
  service: string;
  open: boolean;
  onClose: () => void;
}

export function LogDrawer({ service, open, onClose }: LogDrawerProps) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!open || !service) return;

    setLines([]);
    setConnected(false);

    const es = new EventSource(`/api/services/logs/stream?service=${encodeURIComponent(service)}&tail=150`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "log") {
          setLines(prev => [...prev, { stream: data.stream, line: data.line }]);
        }
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [open, service]);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines]);

  function handleClose() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setLines([]);
    onClose();
  }

  function handleDownload() {
    const text = lines.map(l => l.line).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${service}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
        />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl shadow-2xl"
          style={{ background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <Dialog.Title className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                Logs — {service}
              </Dialog.Title>
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: connected ? "var(--color-primary)" : "var(--color-text-subtle)" }}
                title={connected ? "Connected" : "Disconnected"}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Download size={12} />
                Download
              </button>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                  style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}
                >
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Log body */}
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ background: "var(--color-surface)" }}
          >
            {lines.length === 0 && (
              <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                {connected ? "Waiting for log output…" : "Connecting…"}
              </p>
            )}
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap break-all"
              style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace)" }}
            >
              {lines.map((l, i) => (
                <span
                  key={i}
                  style={{
                    color: l.stream === "stderr"
                      ? "var(--color-error)"
                      : "var(--color-text-muted)",
                    display: "block",
                  }}
                >
                  {l.line}
                </span>
              ))}
            </pre>
            <div ref={bottomRef} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
