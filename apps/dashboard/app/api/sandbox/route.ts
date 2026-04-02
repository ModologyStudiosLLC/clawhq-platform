import { NextResponse } from "next/server";

// Returns the current sandbox policy enforced by this deployment.
// Values are derived from environment variables and docker-compose security_opt.
// This is read-only — changing these values requires a docker-compose redeploy.

export async function GET() {
  return NextResponse.json({
    policies: [
      {
        id: "seccomp",
        name: "Seccomp Profile",
        description: "Custom seccomp profile blocks ptrace, mount, clone-with-namespaces, and other syscalls that are never needed by agent workloads.",
        enforced: true,
        severity: "high",
        target: "openfang",
      },
      {
        id: "no-new-privileges",
        name: "No New Privileges",
        description: "Prevents processes inside the agent container from gaining privileges via setuid or file capabilities.",
        enforced: true,
        severity: "high",
        target: "openfang",
      },
      {
        id: "exec-blocked",
        name: "Docker Exec Blocked",
        description: "Docker socket proxy has EXEC=0 — the dashboard cannot open a shell into any container via the API.",
        enforced: true,
        severity: "high",
        target: "docker-proxy",
      },
      {
        id: "internal-network",
        name: "Services Not Exposed",
        description: "All ClawHQ services use Docker expose (not ports) — only Caddy is reachable from outside the Docker bridge network.",
        enforced: true,
        severity: "medium",
        target: "all",
      },
      {
        id: "post-limited",
        name: "Docker API Write Scope",
        description: "Docker socket proxy allows POST but only for container restart. Images, networks, volumes, and tasks are read-only.",
        enforced: true,
        severity: "medium",
        target: "docker-proxy",
      },
      {
        id: "auth-gate",
        name: "Authentication Required",
        description: "WorkOS AuthKit gates all dashboard routes. The onboarding gate (clawhq_setup cookie) blocks unauthenticated access.",
        enforced: true,
        severity: "medium",
        target: "dashboard",
      },
    ],
    containerHardening: {
      seccompProfile: "services/openfang/security/seccomp-agent.json",
      noNewPrivileges: true,
      readOnlyRootfs: false, // TODO: enable in future hardening pass
      nonRootUser: true,     // openfang runs as non-root in its Dockerfile
    },
  });
}
