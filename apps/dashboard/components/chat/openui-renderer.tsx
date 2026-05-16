"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

// Marker agents emit to signal structured OpenUILang content.
// When the package ships, replace the fallback branch with the real renderer.
const OPENUI_MARKER = "<!--openui-->";

function isOpenUIContent(content: string): boolean {
  return content.trimStart().startsWith(OPENUI_MARKER);
}

interface AgentMessageRendererProps {
  content: string;
  streaming?: boolean;
}

export function AgentMessageRenderer({ content, streaming }: AgentMessageRendererProps) {
  if (isOpenUIContent(content)) {
    // TODO: swap this block for the real OpenUILang renderer once the npm
    // package (@thesystech/openuilang-react or equivalent) ships publicly.
    // The marker gets stripped before passing to the renderer.
    const body = content.slice(OPENUI_MARKER.length).trimStart();
    return (
      <div style={{ lineHeight: "1.6" }}>
        <MarkdownBody content={body} />
        {streaming && <StreamingCursor />}
      </div>
    );
  }

  return (
    <div style={{ lineHeight: "1.6" }}>
      <MarkdownBody content={content} />
      {streaming && <StreamingCursor />}
    </div>
  );
}

function StreamingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle"
      style={{ background: "var(--color-primary)" }}
    />
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
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
        table: ({ children }) => (
          <div style={{ overflowX: "auto", margin: "8px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
