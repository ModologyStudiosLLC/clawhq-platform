"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          background: "var(--color-surface)",
          border: "1px solid rgba(255,107,107,0.25)",
        }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(255,107,107,0.1)" }}
        >
          <AlertCircle size={26} style={{ color: "var(--color-error, #ff6b6b)" }} />
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              color: "#0e0e10",
              fontFamily: "var(--font-display)",
            }}
          >
            C
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            ClawHQ
          </span>
        </div>

        <h1
          className="text-xl font-bold mb-2"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
        >
          Something went wrong
        </h1>

        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}
        >
          {error.message || "An unexpected error occurred. The team has been notified."}
        </p>

        {error.digest && (
          <p
            className="text-xs mb-5 font-mono px-3 py-1.5 rounded-lg inline-block"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text-subtle)",
              border: "1px solid var(--color-border)",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: "var(--color-primary-dim)",
              color: "var(--color-primary)",
              border: "1px solid rgba(105,218,255,0.25)",
            }}
          >
            <RefreshCw size={13} />
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/home")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
