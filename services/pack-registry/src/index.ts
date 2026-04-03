/**
 * ClawHQ Pack Registry — Cloudflare Worker
 *
 * KV structure:
 *   license:{KEY}  → LicenseRecord (JSON)
 *   pack:{PACK_ID} → YAML string
 *
 * Endpoints:
 *   GET  /validate?key=XXX             → { valid, packs, email } or 403
 *   GET  /download?key=XXX&pack=ID     → YAML text or 403
 *   POST /webhooks/stripe              → auto-provision license on purchase
 *   POST /admin/licenses               → manually create a license (admin token required)
 *   PUT  /admin/packs/:id              → upload or update a pack YAML (admin token required)
 *   GET  /admin/licenses               → list all licenses (admin token required)
 *
 * Stripe setup:
 *   1. Add STRIPE_WEBHOOK_SECRET as a wrangler secret (whsec_...)
 *   2. In Stripe Dashboard → Webhooks → add endpoint:
 *        URL: https://packs.clawhqplatform.com/webhooks/stripe
 *        Events: checkout.session.completed
 *   3. On each Stripe product, add metadata:
 *        pack_ids = reskilling-core,augmented-sales   (comma-separated)
 */

export interface Env {
  LICENSES: KVNamespace;
  ADMIN_TOKEN: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
}

interface LicenseRecord {
  key: string;
  email: string;
  packIds: string[];
  orderId: string;
  createdAt: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

function generateKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = [4, 4, 4, 4];
  return segments
    .map(len =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    )
    .join("-");
}

const PACK_NAMES: Record<string, string> = {
  "reskilling-core":       "Reskilling Core Pack",
  "augmented-engineering": "Augmented Engineering Pack",
  "augmented-finance":     "Augmented Finance Pack",
  "augmented-sales":       "Augmented Sales Pack",
  "augmented-support":     "Augmented Support Pack",
  "creator-suite":         "Creator Suite Pack",
};

async function sendLicenseEmail(
  env: Env,
  email: string,
  key: string,
  packIds: string[]
): Promise<void> {
  const packList = packIds
    .map(id => `<li>${PACK_NAMES[id] ?? id}</li>`)
    .join("");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ClawHQ <noreply@clawhqplatform.com>",
      to: [email],
      subject: "Your ClawHQ license key",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#111;">
          <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Your ClawHQ packs are ready.</h1>
          <p style="color:#555;margin-bottom:32px;">Thanks for your purchase. Here's your license key:</p>

          <div style="background:#0c0c0f;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
            <p style="color:#69daff;font-family:monospace;font-size:28px;font-weight:700;letter-spacing:4px;margin:0;">${key}</p>
          </div>

          <p style="margin-bottom:8px;font-weight:600;">Unlocked packs:</p>
          <ul style="color:#555;margin-bottom:32px;padding-left:20px;">
            ${packList}
          </ul>

          <p style="margin-bottom:8px;font-weight:600;">How to activate:</p>
          <ol style="color:#555;margin-bottom:32px;padding-left:20px;line-height:1.8;">
            <li>Open your ClawHQ dashboard</li>
            <li>Go to <strong>Settings → Packs</strong></li>
            <li>Paste your key and click <strong>Activate</strong></li>
            <li>Click <strong>Install</strong> next to each pack</li>
          </ol>

          <hr style="border:none;border-top:1px solid #eee;margin-bottom:24px;" />
          <p style="color:#999;font-size:13px;">
            Questions? Reply to this email or find us on
            <a href="https://discord.gg/clawhq" style="color:#69daff;">Discord</a>.
          </p>
        </div>
      `,
    }),
  });
}

function isAdmin(request: Request, env: Env): boolean {
  const auth = request.headers.get("Authorization") ?? "";
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

// Stripe webhook signature verification using Web Crypto API
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const signed = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
    const expected = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return expected === signature;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // ── Public: validate a license key ────────────────────────────────────────
    if (pathname === "/validate" && request.method === "GET") {
      const key = url.searchParams.get("key")?.toUpperCase();
      if (!key) return json({ error: "key required" }, 400);

      const record = await env.LICENSES.get<LicenseRecord>(`license:${key}`, "json");
      if (!record) return json({ valid: false }, 403);

      return json({ valid: true, email: record.email, packs: record.packIds });
    }

    // ── Public: download a pack YAML ──────────────────────────────────────────
    if (pathname === "/download" && request.method === "GET") {
      const key = url.searchParams.get("key")?.toUpperCase();
      const packId = url.searchParams.get("pack");
      if (!key || !packId) return json({ error: "key and pack required" }, 400);

      const record = await env.LICENSES.get<LicenseRecord>(`license:${key}`, "json");
      if (!record || !record.packIds.includes(packId)) {
        return json({ error: "invalid key or pack not licensed" }, 403);
      }

      const yaml = await env.LICENSES.get(`pack:${packId}`);
      if (!yaml) return json({ error: "pack not found" }, 404);

      return text(yaml);
    }

    // ── Webhook: Stripe checkout.session.completed ────────────────────────────
    if (pathname === "/webhooks/stripe" && request.method === "POST") {
      const payload = await request.text();
      const sigHeader = request.headers.get("Stripe-Signature") ?? "";

      if (env.STRIPE_WEBHOOK_SECRET) {
        const valid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
        if (!valid) return json({ error: "invalid signature" }, 400);
      }

      const event = JSON.parse(payload) as {
        type: string;
        data: {
          object: {
            id: string;
            customer_email?: string;
            customer_details?: { email?: string };
            metadata?: Record<string, string>;
          };
        };
      };

      if (event.type !== "checkout.session.completed") {
        return json({ ok: true, skipped: true });
      }

      const session = event.data.object;
      const email =
        session.customer_email ??
        session.customer_details?.email ??
        "unknown";
      const orderId = session.id;

      // pack_ids comes from Stripe product metadata — comma-separated
      const rawPackIds = session.metadata?.pack_ids ?? "";
      const packIds = rawPackIds
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      if (packIds.length === 0) {
        return json({ error: "no pack_ids in session metadata" }, 400);
      }

      const key = generateKey();
      const record: LicenseRecord = {
        key,
        email,
        packIds,
        orderId,
        createdAt: new Date().toISOString(),
      };

      await env.LICENSES.put(`license:${key}`, JSON.stringify(record));
      await sendLicenseEmail(env, email, key, packIds);

      return json({ ok: true, key });
    }

    // ── Admin: create a license manually ─────────────────────────────────────
    if (pathname === "/admin/licenses" && request.method === "POST") {
      if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);

      const body = await request.json() as { email?: string; packIds?: string[]; orderId?: string };
      if (!body.email || !body.packIds?.length) {
        return json({ error: "email and packIds required" }, 400);
      }

      const key = generateKey();
      const record: LicenseRecord = {
        key,
        email: body.email,
        packIds: body.packIds,
        orderId: body.orderId ?? "manual",
        createdAt: new Date().toISOString(),
      };

      await env.LICENSES.put(`license:${key}`, JSON.stringify(record));
      return json({ ok: true, key, record });
    }

    // ── Admin: list all licenses ──────────────────────────────────────────────
    if (pathname === "/admin/licenses" && request.method === "GET") {
      if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
      const list = await env.LICENSES.list({ prefix: "license:" });
      const records = await Promise.all(
        list.keys.map(k => env.LICENSES.get<LicenseRecord>(k.name, "json"))
      );
      return json(records.filter(Boolean));
    }

    // ── Admin: upload or update a pack YAML ───────────────────────────────────
    if (pathname.startsWith("/admin/packs/") && request.method === "PUT") {
      if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
      const packId = pathname.replace("/admin/packs/", "");
      if (!packId) return json({ error: "pack id required" }, 400);
      const yaml = await request.text();
      await env.LICENSES.put(`pack:${packId}`, yaml);
      return json({ ok: true, packId });
    }

    return json({ error: "not found" }, 404);
  },
};
