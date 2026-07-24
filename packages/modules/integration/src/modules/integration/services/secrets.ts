import { encryptValue, decryptValue } from "./crypto"

/**
 * Return a copy of `values` where each secret key (per the descriptor's `secret` flags)
 * holds a `base64(iv‖tag‖ct)` string; non-secret keys pass through unchanged. Empty/absent
 * secret values are left as-is (nothing to encrypt).
 */
export function encryptSecretsInline(
  values: Record<string, unknown>,
  secretKeys: Iterable<string>,
  key: Buffer
): Record<string, unknown> {
  const secret = new Set(secretKeys)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = secret.has(k) && v != null && v !== "" ? encryptValue(v, key) : v
  }
  return out
}

/**
 * Inverse of {@link encryptSecretsInline}: decrypt each secret key holding a non-empty
 * string blob back to its plaintext value; everything else passes through unchanged.
 */
export function decryptSecretsInline(
  options: Record<string, unknown>,
  secretKeys: Iterable<string>,
  key: Buffer
): Record<string, unknown> {
  const secret = new Set(secretKeys)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(options)) {
    out[k] = secret.has(k) && typeof v === "string" && v !== "" ? decryptValue(v, key) : v
  }
  return out
}
