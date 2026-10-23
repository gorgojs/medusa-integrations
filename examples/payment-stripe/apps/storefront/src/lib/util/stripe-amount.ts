/**
 * Converts a Medusa amount, in major units, to the integer Stripe expects, the same way
 * `@gorgo/medusa-payment-stripe` converts it for the PaymentIntent (`src/utils/amounts.ts` there).
 * The Elements and the PaymentIntent have to agree on the amount, so a change here goes there too.
 */
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "VND", "VUV", "XAF", "XOF", "XPF",
])
// zero-decimal currencies Stripe still takes multiplied by 100, so 5 ISK is 500
const WHOLE_TWO_DECIMAL = new Set(["ISK", "UGX"])
// thousandths, rounded to a hundredth, since Stripe wants the last digit to be 0
const THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "OMR", "TND"])

/** `amount` rounded half up to `decimals` places, then shifted to an integer, without float drift. */
const shift = (amount: number, decimals: number) =>
  Math.round(Number(`${amount.toFixed(10)}e${decimals}`))

export const toStripeAmount = (amount: number, currencyCode: string) => {
  const code = currencyCode.toUpperCase()
  if (ZERO_DECIMAL.has(code)) {
    return shift(amount, 0)
  }
  if (WHOLE_TWO_DECIMAL.has(code)) {
    return shift(amount, 0) * 100
  }
  if (THREE_DECIMAL.has(code)) {
    return shift(amount, 2) * 10
  }
  return shift(amount, 2)
}
