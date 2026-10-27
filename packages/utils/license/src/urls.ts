/**
 * Hardcoded on purpose. An address read from the environment would let a merchant point the check
 * at a server of their own that approves everything.
 */
export const VERIFY_URLS: readonly string[] = [
  "https://api.gorgojs.com/v1/licenses/check",
  "https://app.gorgojs.com/license/verify",
]

export function verifyUrls(): string[] {
  return [...VERIFY_URLS]
}
