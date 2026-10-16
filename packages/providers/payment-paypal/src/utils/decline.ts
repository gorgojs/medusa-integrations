/**
 * Turns a PayPal decline into a code, a buyer-facing message and whether another
 * attempt could succeed. The message and retry decisions follow
 * @easypayment/medusa-payment-paypal 1.3.2 (`utils/decline-codes.ts`).
 */

export type PayPalDecline = {
  /** PayPal issue name (`INSTRUMENT_DECLINED`) or processor `response_code` (`5120`). */
  code: string
  /** Safe to show to the buyer. */
  message: string
  /** False for hard declines, where offering a retry only frustrates the buyer. */
  retryable: boolean
  avsCode?: string
  cvvCode?: string
}

type Rule = { message: string; retryable: boolean }

const ISSUES: Record<string, Rule> = {
  INSTRUMENT_DECLINED: {
    message: "Your payment method was declined. Please try a different card or payment method.",
    retryable: true,
  },
  TRANSACTION_REFUSED: {
    message: "The payment was refused. Please try again or use a different payment method.",
    retryable: true,
  },
  PAYER_CANNOT_PAY: {
    message: "This PayPal account cannot complete the payment. Please use a different payment method.",
    retryable: false,
  },
  PAYER_ACCOUNT_RESTRICTED: {
    message: "The PayPal account is restricted and cannot complete this payment.",
    retryable: false,
  },
  PAYER_ACCOUNT_LOCKED_OR_CLOSED: {
    message: "The PayPal account is locked or closed. Please use a different payment method.",
    retryable: false,
  },
  INSUFFICIENT_FUNDS: {
    message: "The payment was declined due to insufficient funds. Please use a different payment method.",
    retryable: true,
  },
  CARD_EXPIRED: {
    message: "The card has expired. Please use a different card.",
    retryable: true,
  },
  COMPLIANCE_VIOLATION: {
    message: "This transaction cannot be processed.",
    retryable: false,
  },
}

const PROCESSOR_CODES: Record<string, Rule> = {
  "0500": {
    message: "The card was declined by the issuing bank. Please try a different card or contact your bank.",
    retryable: true,
  },
  "1330": { message: "The card account is not valid. Please use a different card.", retryable: true },
  "5100": { message: "The card was declined. Please try a different payment method.", retryable: true },
  "5110": {
    message: "The card's security code (CVV) did not match. Please check the code and try again.",
    retryable: true,
  },
  "5120": {
    message: "The card was declined due to insufficient funds. Please use a different payment method.",
    retryable: true,
  },
  "5180": {
    message: "This card cannot be used for this purchase. Please use a different card.",
    retryable: true,
  },
  "5400": { message: "The card has expired. Please use a different card.", retryable: true },
  "9500": {
    message: "This transaction was declined. Please contact your bank or use a different payment method.",
    retryable: false,
  },
  "9520": {
    message: "This card has been reported lost or stolen and cannot be used. Please use a different card.",
    retryable: false,
  },
  "00N7": {
    message: "The card's security code (CVV) was incorrect. Please check the code and try again.",
    retryable: true,
  },
}

const GENERIC: Rule = {
  message: "The payment was declined. Please try again or use a different payment method.",
  retryable: true,
}

type DeclineSource = {
  details?: Array<{ issue?: string }>
  status?: string
  processor_response?: { response_code?: string; avs_code?: string; cvv_code?: string }
  purchase_units?: Array<{ payments?: { captures?: DeclineSource[] } }>
}

/**
 * Reads a decline from a PayPal response body: a 4xx error body
 * (`{ name, details: [{ issue }] }`), or a 2xx order or capture whose capture came
 * back DECLINED or FAILED with a `processor_response`. Null when the body holds no
 * decline.
 */
export function getPayPalDecline(payload: unknown): PayPalDecline | null {
  if (!payload || typeof payload !== "object") {
    return null
  }
  const body = payload as DeclineSource

  for (const detail of body.details ?? []) {
    const issue = String(detail?.issue ?? "").toUpperCase()
    if (ISSUES[issue]) {
      return { code: issue, ...ISSUES[issue] }
    }
    if (issue.includes("DECLINED")) {
      return { code: issue, ...GENERIC }
    }
  }

  const captures = [...(body.purchase_units?.[0]?.payments?.captures ?? [])]
  if (body.processor_response) {
    captures.push(body)
  }
  for (const capture of captures) {
    const status = String(capture?.status ?? "").toUpperCase()
    const processor = capture?.processor_response
    if (!processor || (status && status !== "DECLINED" && status !== "FAILED")) {
      continue
    }
    const responseCode = String(processor.response_code ?? "").toUpperCase()
    return {
      code: responseCode || "DECLINED",
      ...(PROCESSOR_CODES[responseCode] ?? GENERIC),
      avsCode: processor.avs_code || undefined,
      cvvCode: processor.cvv_code || undefined,
    }
  }

  return null
}
