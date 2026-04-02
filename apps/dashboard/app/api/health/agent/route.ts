import { NextResponse } from "next/server";

// Returns the Paperclip AgentPack YAML for a health-check agent.
// Download and import into Paperclip to enable scheduled health monitoring.
const AGENT_PACK = `apiVersion: paperclip.ai/v1
kind: AgentPack
metadata:
  name: clawhq-health-monitor
  displayName: ClawHQ Health Monitor
  description: Periodically checks all ClawHQ service endpoints and sends alerts when a service is degraded or offline.
  version: "1.0.0"

spec:
  trigger:
    type: schedule
    cron: "*/5 * * * *"   # every 5 minutes

  model: claude-haiku-4-5-20251001  # lightweight — just checking endpoints

  tools:
    - type: http
      name: check_openclaw
      url: "{{env.OPENCLAW_INTERNAL_URL}}/healthz"
      method: GET
      timeout: 5s

    - type: http
      name: check_paperclip
      url: "{{env.PAPERCLIP_INTERNAL_URL}}/api/companies"
      method: GET
      timeout: 5s

    - type: http
      name: check_openfang
      url: "{{env.OPENFANG_INTERNAL_URL}}/api/health"
      method: GET
      timeout: 5s

    - type: http
      name: check_hermes
      url: "{{env.HERMES_INTERNAL_URL}}/health"
      method: GET
      timeout: 5s

    - type: http
      name: send_alert
      url: "{{env.CLAWHIP_INTERNAL_URL}}/send"
      method: POST
      headers:
        Content-Type: application/json

  instructions: |
    You are a health monitoring agent for ClawHQ. Your job:

    1. Call each health check tool (check_openclaw, check_paperclip, check_openfang, check_hermes).
    2. Note which services returned non-2xx status or failed entirely.
    3. If ANY service is degraded or offline, call send_alert with this JSON body:
       { "channel": "default", "message": "⚠️ Health alert: [SERVICE] is [STATUS] as of [TIME UTC]" }
    4. If all services are healthy, do nothing (no alert needed).
    5. Respond with a brief summary of the check results.

    Be concise. Do not retry failed endpoints — just report them.

  delivery:
    type: none   # agent runs silently; alerts go via send_alert tool
`;

export async function GET() {
  return new NextResponse(AGENT_PACK, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clawhq-health-monitor.yaml"',
    },
  });
}
