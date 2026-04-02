import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(105,218,255,0.06) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mb-5"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              color: "#0e0e10",
              fontFamily: "Manrope, sans-serif",
            }}
          >
            C
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}
          >
            ClawHQ
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Your AI agent command center
          </p>
        </div>

        {/* Sign-in card */}
        <div
          className="card p-8 space-y-5"
          style={{ borderColor: "var(--color-border-strong)" }}
        >
          <div>
            <h2
              className="text-lg font-semibold mb-1"
              style={{ color: "var(--color-text)", fontFamily: "Manrope, sans-serif" }}
            >
              Sign in to your workspace
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Authenticated via WorkOS — your credentials stay private.
            </p>
          </div>

          {/* Primary CTA */}
          <Link
            href="/auth/sign-in"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              color: "#0e0e10",
            }}
          >
            Continue with WorkOS
            <ArrowRight size={15} />
          </Link>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              secure sign-in
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>

          {/* Trust note */}
          <div
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            <Shield size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              ClawHQ uses WorkOS for authentication. Your agents, data, and API keys stay within your self-hosted instance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-subtle)" }}>
          Modology Studios · ClawHQ
        </p>
      </div>
    </div>
  );
}
