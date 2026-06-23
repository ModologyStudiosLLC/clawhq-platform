/**
 * Tenant provisioning — called by Stripe webhook on subscription.created.
 * Creates a D1 database for the org via Cloudflare REST API,
 * registers it in KV TENANT_REGISTRY, and sets WorkOS org metadata.
 */

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const CF_KV_TENANT_REGISTRY = process.env.CF_KV_TENANT_REGISTRY_ID ?? "";
const WORKOS_API_KEY = process.env.WORKOS_API_KEY ?? "";

export interface TenantRecord {
  orgId: string;
  d1DatabaseId: string;
  stripeCustomerId: string;
  tier: "cloud" | "enterprise";
  seats: number;
  provisionedAt: string;
}

export async function provisionTenant(opts: {
  orgId: string;
  stripeCustomerId: string;
  seats: number;
  tier?: "cloud" | "enterprise";
}): Promise<TenantRecord> {
  const { orgId, stripeCustomerId, seats, tier = "cloud" } = opts;

  // 1. Create D1 database for this org
  const dbName = `clawhq-tenant-${orgId}`;
  const d1Res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: dbName }),
    }
  );

  if (!d1Res.ok) {
    const err = await d1Res.text();
    throw new Error(`D1 create failed: ${d1Res.status} ${err}`);
  }

  const d1Data = await d1Res.json() as { result: { uuid: string } };
  const d1DatabaseId = d1Data.result.uuid;

  // 2. Register in KV TENANT_REGISTRY — if this fails, delete the D1 db to avoid orphan
  const record: TenantRecord = {
    orgId,
    d1DatabaseId,
    stripeCustomerId,
    tier,
    seats,
    provisionedAt: new Date().toISOString(),
  };

  try {
    await writeKV(orgId, JSON.stringify(record));
  } catch (err) {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${d1DatabaseId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
    ).catch(() => {});
    throw err;
  }

  // 3. Set WorkOS org metadata (best-effort — non-fatal)
  await setWorkOSOrgMetadata(orgId, { tier, seats, d1DatabaseId });

  return record;
}

export async function deprovisionTenant(orgId: string): Promise<void> {
  const raw = await readKV(orgId);
  if (!raw) return;

  const record = JSON.parse(raw) as TenantRecord;

  // Delete D1 database
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${record.d1DatabaseId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    }
  );

  // Remove from KV
  await deleteKV(orgId);

  // Downgrade WorkOS org metadata
  await setWorkOSOrgMetadata(orgId, { tier: "free", seats: 0, d1DatabaseId: "" });
}

export async function getTenantRecord(orgId: string): Promise<TenantRecord | null> {
  const raw = await readKV(orgId);
  if (!raw) return null;
  return JSON.parse(raw) as TenantRecord;
}

// ── KV helpers (CF REST API) ──────────────────────────────────────────────────

async function writeKV(key: string, value: string): Promise<void> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_TENANT_REGISTRY}/values/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
      body: value,
    }
  );
  if (!res.ok) throw new Error(`KV write failed: ${res.status}`);
}

async function readKV(key: string): Promise<string | null> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_TENANT_REGISTRY}/values/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`KV read failed: ${res.status}`);
  return res.text();
}

async function deleteKV(key: string): Promise<void> {
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_TENANT_REGISTRY}/values/${encodeURIComponent(key)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    }
  );
}

// ── WorkOS org metadata ───────────────────────────────────────────────────────

async function setWorkOSOrgMetadata(
  orgId: string,
  meta: { tier: string; seats: number; d1DatabaseId: string }
): Promise<void> {
  const res = await fetch(`https://api.workos.com/organizations/${orgId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${WORKOS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata: {
        clawhq_tier: meta.tier,
        clawhq_seats: String(meta.seats),
        clawhq_d1_id: meta.d1DatabaseId,
      },
    }),
  });

  if (!res.ok) {
    console.error(`WorkOS org metadata update failed: ${res.status}`);
  }
}
