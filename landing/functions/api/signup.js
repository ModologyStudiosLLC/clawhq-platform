/**
 * Cloudflare Pages Function — POST /api/signup
 *
 * Accepts { email } and:
 *   1. Stores in KV (if WAITLIST_KV binding is configured)
 *   2. Forwards to webhook (if WAITLIST_WEBHOOK_URL env var is set)
 *
 * Setup in Cloudflare Pages dashboard:
 *   Settings → Functions → KV namespace bindings → add WAITLIST_KV
 *   Settings → Environment variables → add WAITLIST_WEBHOOK_URL (optional)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email || !email.includes("@") || !email.includes(".")) {
      return json({ error: "Invalid email" }, 400);
    }

    // ── Store in KV ──────────────────────────────────────────────────────────
    if (env.WAITLIST_KV) {
      const existing = await env.WAITLIST_KV.get("emails");
      const emails = existing ? JSON.parse(existing) : [];

      if (!emails.includes(email)) {
        emails.push(email);
        await env.WAITLIST_KV.put("emails", JSON.stringify(emails));
        await env.WAITLIST_KV.put(
          `signup:${Date.now()}`,
          JSON.stringify({ email, ts: new Date().toISOString() })
        );
      }
    }

    // ── Forward to webhook (Discord, Slack, Zapier, etc.) ───────────────────
    if (env.WAITLIST_WEBHOOK_URL) {
      fetch(env.WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          timestamp: new Date().toISOString(),
          source: "clawhq-landing",
        }),
      }).catch(() => {});
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Server error" }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
