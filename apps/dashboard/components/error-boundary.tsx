"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

// ── ErrorCard — standalone presentational component ───────────────────────────

interface ErrorCardProps {
  message?: string;
  onReset?: () => void;
}

export function ErrorCard({ message, onReset }: ErrorCardProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[240px] rounded-2xl p-8 text-center"
      style={{
        background: "var(--color-surface)",
        border: "1px solid color-mix(in srgb, var(--color-error) 25%, transparent)",
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(255,107,107,0.1)" }}
      >
        <AlertCircle size={22} style={{ color: "var(--color-error)" }} />
      </div>

      <h2
        className="text-base font-bold mb-1"
        style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
      >
        Something went wrong
      </h2>

      {message && (
        <p
          className="text-xs mb-5 max-w-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          {message}
        </p>
      )}

      <div className="flex gap-3">
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--color-primary-dim)",
              color: "var(--color-primary)",
              border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
            }}
          >
            <RefreshCw size={13} />
            Try again
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--color-surface-2)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}

// ── ErrorBoundary — class component ──────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary] Caught error:", error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorCard
          message={this.state.error?.message}
          onReset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
