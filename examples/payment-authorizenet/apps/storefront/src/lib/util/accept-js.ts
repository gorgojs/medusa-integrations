import { digitsOnly, parseExpiry, type CardFields } from "@lib/util/card"

/** The one-time token Accept.js returns for a card, which the backend charges. */
export type OpaqueData = {
  dataDescriptor: string
  dataValue: string
}

type AcceptResponse = {
  messages: {
    resultCode: "Ok" | "Error"
    message: { code: string; text: string }[]
  }
  opaqueData?: OpaqueData
}

type AcceptJs = {
  dispatchData: (
    secureData: {
      authData: { clientKey: string; apiLoginID: string }
      cardData: { cardNumber: string; month: string; year: string; cardCode: string }
    },
    responseHandler: (response: AcceptResponse) => void
  ) => void
}

declare global {
  interface Window {
    Accept?: AcceptJs
  }
}

/** Accept.js from Authorize.net. It has to load from their domain; it cannot be bundled. */
export const ACCEPT_JS_URLS = {
  sandbox: "https://jstest.authorize.net/v1/Accept.js",
  production: "https://js.authorize.net/v1/Accept.js",
} as const

/** An Accept.js failure, named after its key in the `AuthorizeNetCard` catalog. */
export type AcceptProblem = "invalidNumber" | "invalidExpiry" | "invalidCvc" | "insecure" | "tokenError"

/** Accept.js error codes the customer can do something about. Every other code is `tokenError`. */
const PROBLEMS: Record<string, AcceptProblem> = {
  E_WC_02: "insecure",
  E_WC_05: "invalidNumber",
  E_WC_06: "invalidExpiry",
  E_WC_07: "invalidExpiry",
  E_WC_08: "invalidExpiry",
  E_WC_15: "invalidCvc",
}

export class AcceptError extends Error {
  constructor(
    readonly problem: AcceptProblem,
    readonly code?: string
  ) {
    super(code ? `Accept.js ${code}` : "Accept.js failed")
  }
}

/**
 * Sends the card to Authorize.net and resolves with the token. The card number never reaches the
 * shop's server: only the token does, and it is good for one transaction within 15 minutes.
 */
export function createCardToken(
  card: CardFields,
  auth: { apiLoginId: string; clientKey: string }
): Promise<OpaqueData> {
  const accept = typeof window === "undefined" ? undefined : window.Accept
  const expiry = parseExpiry(card.expiry)
  if (!accept) {
    return Promise.reject(new AcceptError("tokenError"))
  }
  if (!expiry) {
    return Promise.reject(new AcceptError("invalidExpiry"))
  }

  return new Promise((resolve, reject) => {
    accept.dispatchData(
      {
        authData: { clientKey: auth.clientKey, apiLoginID: auth.apiLoginId },
        cardData: {
          cardNumber: digitsOnly(card.number),
          month: expiry.month,
          year: expiry.year,
          cardCode: card.cvc,
        },
      },
      (response) => {
        if (response.messages.resultCode === "Ok" && response.opaqueData) {
          resolve(response.opaqueData)
          return
        }
        const code = response.messages.message?.[0]?.code
        reject(new AcceptError(PROBLEMS[code ?? ""] ?? "tokenError", code))
      }
    )
  })
}
