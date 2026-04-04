"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Send, Loader2, Settings2 } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark-dimmed.css";

interface Agent {
  id: string;
  name: string;
  state: string;
  model_provider: string;
  model_name: string;
  profile: string | null;
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  streaming?: boolean;
  cost?: number;
}

function agentEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("research")) return "🔭";
  if (n.includes("lead")) return "📊";
  if (n.includes("collector")) return "🔍";
  if (n.includes("predictor")) return "🔮";
  if (n.includes("writer")) return "✍️";
  if (n.includes("code") || n.includes("api")) return "⚙️";
  if (n.includes("support") || n.includes("customer")) return "💬";
  if (n.includes("data") || n.includes("analyst")) return "📈";
  return "🤖";
}

export function ChatInterface({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load agent info + create session
  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then((agents: Agent[]) => {
        const found = agents.find(a => a.id === agentId);
        if (found) setAgent(found);
      });

    fetch("/api/chat/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    })
      .then(r => r.json())
      .then(d => setSessionId(d.session_id));
  }, [agentId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || !sessionId || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    const agentMsgId = (Date.now() + 1).toString();
    const agentMsg: Message = {
      id: agentMsgId,
      role: "agent",
      content: "",
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, agentMsg]);
    setInput("");
    setSending(true);
    inputRef.current?.focus();

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, sessionId, message: userMsg.content }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content !== undefined && !data.done) {
                accumulated += data.content;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMsgId ? { ...m, content: accumulated } : m
                  )
                );
              }
              if (data.done) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMsgId ? { ...m, streaming: false } : m
                  )
                );
              }
              if (data.cost_usd !== undefined) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMsgId ? { ...m, cost: data.cost_usd, streaming: false } : m
                  )
                );
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMsgId
            ? { ...m, content: "Something went wrong. Try again.", streaming: false }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [input, sessionId, sending, agentId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const emoji = agent ? agentEmoji(agent.name) : "🤖";

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: "calc(100vh - 73px)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <Link
          href="/team"
          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: "var(--color-surface-2)" }}
        >
          {emoji}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)", fontFamily: var(--font-display) }}>
            {agent?.name || "Loading..."}
          </p>
          <p className="text-xs" style={{ color: agent?.state === "Running" ? "var(--color-secondary)" : "var(--color-error)" }}>
            {agent?.state === "Running" ? "Active" : agent?.state || "..."}
          </p>
        </div>
        <Link
          href={`/team/${agentId}/settings`}
          className="ml-auto p-2 rounded-lg flex-shrink-0"
          style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}
          title="Agent settings"
        >
          <Settings2 size={15} />
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
              style={{ background: "var(--color-surface-2)" }}
            >
              {emoji}
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)", fontFamily: var(--font-display) }}>
              {agent?.name || "Agent"}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Send a message to get started
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
          >
            {msg.role === "agent" && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                style={{ background: "var(--color-surface-2)" }}
              >
                {emoji}
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed${msg.role === "agent" ? " chat-message-agent" : ""}`}
              style={{
                background: msg.role === "user" ? "var(--color-primary)" : "var(--color-surface-2)",
                color: msg.role === "user" ? "var(--color-on-brand)" : "var(--color-text)",
                borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                borderBottomLeftRadius: msg.role === "agent" ? "4px" : undefined,
              }}
            >
              {msg.role === "agent" ? (
                <>
                  {!msg.content && msg.streaming && (
                    <span className="flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                      <Loader2 size={12} className="animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </span>
                  )}
                  {msg.content && (
                    <div style={{ lineHeight: "1.6" }}>
                      <ReactMarkdown
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          code: ({ className, children, ...props }) => {
                            const isInline = !className;
                            if (isInline) {
                              return (
                                <code
                                  style={{
                                    background: "var(--color-surface-2)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "4px",
                                    padding: "1px 6px",
                                    fontSize: "12px",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                            return <code className={className} {...props}>{children}</code>;
                          },
                          pre: ({ children }) => (
                            <pre
                              style={{
                                background: "var(--color-bg)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                padding: "12px 16px",
                                overflowX: "auto",
                                margin: "8px 0",
                                fontSize: "12px",
                              }}
                            >
                              {children}
                            </pre>
                          ),
                          ul: ({ children }) => <ul style={{ paddingLeft: "16px", margin: "6px 0", listStyleType: "disc" }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ paddingLeft: "16px", margin: "6px 0", listStyleType: "decimal" }}>{children}</ol>,
                          li: ({ children }) => <li style={{ marginBottom: "2px" }}>{children}</li>,
                          strong: ({ children }) => <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>{children}</strong>,
                          a: ({ children, href }) => <a href={href} style={{ color: "var(--color-primary)", textDecoration: "underline" }}>{children}</a>,
                          h1: ({ children }) => <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "4px", color: "var(--color-text)" }}>{children}</h1>,
                          h2: ({ children }) => <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "4px", color: "var(--color-text)" }}>{children}</h2>,
                          h3: ({ children }) => <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "4px", color: "var(--color-text)" }}>{children}</h3>,
                          blockquote: ({ children }) => (
                            <blockquote style={{ borderLeft: "2px solid var(--color-border-strong)", paddingLeft: "12px", color: "var(--color-text-muted)", margin: "6px 0" }}>
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {msg.streaming && (
                        <span
                          className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle"
                          style={{ background: "var(--color-primary)" }}
                        />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {msg.content}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 px-4 py-3 border-t"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div
          className="flex items-end gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent?.name || "agent"}...`}
            rows={1}
            className="flex-1 bg-transparent text-sm outline-none resize-none"
            style={{
              color: "var(--color-text)",
              maxHeight: "120px",
              lineHeight: "1.5",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || !sessionId || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
            style={{
              background: input.trim() ? "var(--color-primary)" : "var(--color-surface)",
              color: input.trim() ? "var(--color-on-brand)" : "var(--color-text-muted)",
            }}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: "var(--color-text-subtle)" }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
