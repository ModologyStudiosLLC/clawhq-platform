/**
 * AES-256-GCM credential encryption for at-rest storage.
 *
 * Key is derived from BETTER_AUTH_SECRET (required in .env). No extra env
 * vars or dependencies — uses Node.js built-in crypto only.
 *
 * Ciphertext format (colon-separated, all hex):
 *   <12-byte IV>:<16-byte auth tag>:<ciphertext>
 *
 * A stored value is "encrypted" if it contains exactly 2 colons and the
 * first segment is 24 hex chars (12 bytes). Plaintext values that happen
 * to match this pattern are vanishingly unlikely.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const ENCRYPTED_MARKER = /^[0-9a-f]{24}:[0-9a-f]{32}:/i;

function deriveKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!secret) {
    // No key configured — encryption is a no-op (open/dev mode).
    return Buffer.alloc(32, 0);
  }
  // SHA-256 of the secret → exactly 32 bytes for AES-256.
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = deriveKey();
  // If key is all-zeroes (no secret configured) store plaintext.
  if (key.every((b) => b === 0)) return plaintext;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(stored: string): string {
  if (!stored) return stored;
  if (!ENCRYPTED_MARKER.test(stored)) return stored; // plaintext — migrate on next write

  const key = deriveKey();
  if (key.every((b) => b === 0)) return stored;

  try {
    const parts = stored.split(":");
    if (parts.length < 3) return stored;
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    // Ciphertext may itself contain colons (hex won't, but be safe).
    const ciphertext = Buffer.from(parts.slice(2).join(":"), "hex");

    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
  } catch {
    // Auth tag mismatch or corrupted data — return empty so UI shows "not set".
    return "";
  }
}

/** Returns true if the stored string looks like an encrypted value. */
export function isEncrypted(value: string): boolean {
  return ENCRYPTED_MARKER.test(value);
}
