import crypto from "crypto"

const ALGO = "aes-256-gcm"
const TAG_LEN = 16
const IV_LEN = 12

/** Derive a 32-byte AES key from any non-empty passphrase (SHA-256). */
export function deriveKey(passphrase: string): Buffer {
  return crypto.createHash("sha256").update(passphrase, "utf8").digest()
}

/**
 * Encrypt one JSON-serializable value. Returns a single base64 string containing
 * `iv ‖ authTag ‖ ciphertext` — the IV is random per call (required for GCM) and folded
 * into the blob, so no separate IV field is stored.
 */
export function encryptValue(value: unknown, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const plaintext = Buffer.from(JSON.stringify(value), "utf8")
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64")
}

/** Inverse of {@link encryptValue}. Throws if the key is wrong or the blob was tampered. */
export function decryptValue(blob: string, key: Buffer): unknown {
  const raw = Buffer.from(blob, "base64")
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const enc = raw.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return JSON.parse(dec.toString("utf8"))
}
