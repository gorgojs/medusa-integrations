/**
 * The one password rule for the whole storefront.
 *
 * Medusa enforces nothing of its own: `POST /auth/customer/emailpass/register`
 * accepts a single character. So whatever the storefront does not check, nobody
 * does. Registration and the reset flow both go through here so the two cannot
 * drift apart and leave a password that one accepts and the other rejects.
 *
 * The returned value is a key in the `Errors` namespace, which is what
 * `ErrorMessage` resolves against.
 */
export const PASSWORD_MIN_LENGTH = 8

export type PasswordError = "passwordTooShort" | "passwordMismatch"

export function validatePassword(
  password: string,
  confirmation?: string
): PasswordError | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "passwordTooShort"
  }

  if (confirmation !== undefined && password !== confirmation) {
    return "passwordMismatch"
  }

  return null
}
