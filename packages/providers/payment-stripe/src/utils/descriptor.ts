/** Stripe's limit for the whole card statement descriptor: prefix, `* `, and suffix. */
export const STATEMENT_DESCRIPTOR_MAX = 22

/**
 * Why Stripe would reject a statement descriptor suffix, or `null` when it is fine. Stripe takes
 * Latin characters only, needs at least one letter, and refuses `< > \ ' " *`
 * (https://docs.stripe.com/get-started/account/statement-descriptors).
 */
export function statementDescriptorSuffixError(value: string): string | null {
  if (value.length > STATEMENT_DESCRIPTOR_MAX) {
    return `at most ${STATEMENT_DESCRIPTOR_MAX} characters`
  }
  if (!/^[\x20-\x7E]+$/.test(value)) {
    return "Latin letters, digits and punctuation only"
  }
  if (/[<>\\'"*]/.test(value)) {
    return "no < > \\ ' \" or *"
  }
  if (!/[A-Za-z]/.test(value)) {
    return "at least one letter"
  }
  return null
}
