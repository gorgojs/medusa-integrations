import crypto from "crypto"

const ALGO = "aes-256-gcm"
const TAG_LEN = 16
const IV_LEN = 12

/** Derive a 32-byte AES key from any non-empty passphrase (SHA-256). */
export function deriveKey(passphrase: string): Buffer {
  return crypto.createHash("sha256").update(passphrase, "utf8").digest()
}

/**
 * The format `encryptValue` writes: `v1:` followed by base64 of `iv ‖ authTag ‖ ciphertext`.
 * The IV is random per call (required for GCM) and folded into the blob, so no separate IV field
 * is stored.
 *
 * A value without a prefix is what 0.x wrote, the same base64 with no version. Base64 has no `:`,
 * so the two can't be confused. A later format, for example one that names the key it was
 * encrypted with for key rotation, gets the next version number.
 */
const FORMAT_VERSION = 1
const VERSIONED = /^v(\d+):(.*)$/s

/** Encrypt one JSON-serializable value into a `v1:` string. */
export function encryptValue(value: unknown, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const plaintext = Buffer.from(JSON.stringify(value), "utf8")
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v${FORMAT_VERSION}:${Buffer.concat([iv, tag, enc]).toString("base64")}`
}

/**
 * Inverse of {@link encryptValue}, which also reads the unprefixed values 0.x wrote. Throws if the
 * key is wrong, the blob was tampered, or the blob is in a format this version doesn't know.
 */
export function decryptValue(blob: string, key: Buffer): unknown {
  const versioned = VERSIONED.exec(blob)
  if (!versioned) return decryptPayload(blob, key)
  if (Number(versioned[1]) !== FORMAT_VERSION) {
    throw new Error(
      `A secret is stored in format v${versioned[1]}, which this version of ` +
        `@gorgo/medusa-integration can't read. Upgrade the module to read it.`
    )
  }
  return decryptPayload(versioned[2], key)
}

function decryptPayload(payload: string, key: Buffer): unknown {
  const raw = Buffer.from(payload, "base64")
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const enc = raw.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return JSON.parse(dec.toString("utf8"))
}
