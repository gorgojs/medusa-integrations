import { MedusaError } from "@medusajs/framework/utils"
import { encryptValue, decryptValue, isEncryptedValue, UnsupportedSecretFormatError } from "./crypto"

/**
 * Return a copy of `values` where each secret key (per the descriptor's `secret` flags)
 * holds an encrypted `v1:` string (see `encryptValue`); non-secret keys pass through unchanged.
 * Empty/absent secret values are left as-is (nothing to encrypt).
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
 * Inverse of {@link encryptSecretsInline}, which also survives a `secret` flag that changed after
 * the values were saved:
 * - a secret option holding plain text, saved before the option became secret, is returned as is;
 * - a plain option holding an encrypted value, saved while the option was secret, is decrypted.
 *
 * `key` is called only when a value has to be decrypted. An encrypted value of a secret option
 * that doesn't decrypt throws a `MedusaError` naming the option and the integration.
 */
export function decryptSecretsInline(
  options: Record<string, unknown>,
  secretKeys: Iterable<string>,
  key: () => Buffer,
  providerId: string
): Record<string, unknown> {
  const secret = new Set(secretKeys)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(options)) {
    if (typeof v !== "string" || !isEncryptedValue(v)) out[k] = v
    else out[k] = secret.has(k) ? decryptSecret(v, key, k, providerId) : decryptLeftover(v, key)
  }
  return out
}

/**
 * The plain options of a record as the Admin shows them: a value encrypted while its option was
 * secret is decrypted, and secret options stay as stored. Never throws, so a record whose secrets
 * no longer decrypt can still be shown.
 */
export function decryptPlainOptions(
  options: Record<string, unknown>,
  secretKeys: Iterable<string>,
  key: () => Buffer
): Record<string, unknown> {
  const secret = new Set(secretKeys)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(options)) {
    out[k] = !secret.has(k) && typeof v === "string" && isEncryptedValue(v) ? decryptLeftover(v, key) : v
  }
  return out
}

function decryptSecret(value: string, key: () => Buffer, option: string, providerId: string): unknown {
  const derived = key()
  try {
    return decryptValue(value, derived)
  } catch (e) {
    const where = `the secret option "${option}" of the integration "${providerId}"`
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      e instanceof UnsupportedSecretFormatError
        ? `Can't read ${where}: it's stored in format v${e.version}, which this version of ` +
            `@gorgo/medusa-integration doesn't know. Upgrade the module.`
        : `Can't decrypt ${where}: encryptionKey isn't the key it was saved with, or the stored ` +
            `value is damaged. Set encryptionKey back to the key it was saved with, or delete the ` +
            `integration's settings and enter them again.`
    )
  }
}

/** A plain option's value that only looks encrypted stays as stored, and so does one without a key. */
function decryptLeftover(value: string, key: () => Buffer): unknown {
  try {
    return decryptValue(value, key())
  } catch {
    return value
  }
}
