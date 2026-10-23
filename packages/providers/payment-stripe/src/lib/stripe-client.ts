import Stripe from "stripe"
import { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * The API version every request runs on. stripe-node's types describe exactly one version, the one
 * the installed SDK was generated for, so the SDK is pinned to an exact version and this constant
 * moves with it.
 */
export const STRIPE_API_VERSION = "2026-09-30.endive" as const

export const STRIPE_TIMEOUT_MS = 30_000

/**
 * stripe-node retries connection errors, 409 and 5xx, and adds an idempotency key to every POST it
 * retries, so a retry never charges twice.
 */
export const STRIPE_MAX_NETWORK_RETRIES = 2

const APP_INFO = {
  name: "@gorgo/medusa-payment-stripe",
  url: "https://github.com/gorgojs/medusa-integrations/tree/main/packages/providers/payment-stripe",
}

// One client per secret key: the provider resolves its settings on every call, and the SDK keeps
// its HTTP agent and retry state on the client.
const clients = new Map<string, Stripe>()

export function getStripe(secretKey: string): Stripe {
  let client = clients.get(secretKey)
  if (!client) {
    client = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      timeout: STRIPE_TIMEOUT_MS,
      maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
      appInfo: APP_INFO,
    })
    clients.set(secretKey, client)
  }
  return client
}

/** Drops every cached client. For tests and for a changed secret key. */
export function clearStripeClients() {
  clients.clear()
}

/** A Stripe API failure, carrying Stripe's error fields next to Medusa's error type. */
export class StripeApiError extends MedusaError {
  readonly stripeType?: string
  readonly stripeCode?: string
  readonly declineCode?: string
  readonly requestId?: string
  readonly statusCode?: number
  /** The PaymentIntent a card error refers to, when Stripe returns one. */
  readonly paymentIntent?: Stripe.PaymentIntent

  constructor(
    type: string,
    message: string,
    fields: {
      stripeType?: string
      stripeCode?: string
      declineCode?: string
      requestId?: string
      statusCode?: number
      paymentIntent?: Stripe.PaymentIntent
    }
  ) {
    super(type, message, fields.declineCode ?? fields.stripeCode)
    this.stripeType = fields.stripeType
    this.stripeCode = fields.stripeCode
    this.declineCode = fields.declineCode
    this.requestId = fields.requestId
    this.statusCode = fields.statusCode
    this.paymentIntent = fields.paymentIntent
  }
}

type StripeErrorLike = {
  type?: string
  message?: string
  code?: string
  decline_code?: string
  requestId?: string
  statusCode?: number
  payment_intent?: Stripe.PaymentIntent
}

function isStripeError(error: unknown): error is StripeErrorLike {
  return error instanceof Stripe.errors.StripeError
}

function medusaTypeFor(stripeType?: string): string {
  switch (stripeType) {
    case "StripeCardError":
      return MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR
    case "StripeInvalidRequestError":
      return MedusaError.Types.INVALID_DATA
    case "StripeAuthenticationError":
    case "StripePermissionError":
      return MedusaError.Types.UNAUTHORIZED
    case "StripeIdempotencyError":
      return MedusaError.Types.CONFLICT
    default:
      return MedusaError.Types.UNEXPECTED_STATE
  }
}

/**
 * Turns a Stripe SDK error into a `StripeApiError`, keeping the code, the decline code and the
 * request id that Stripe support asks for. Anything that is not a Stripe error passes through.
 */
export function toStripeError(operation: string, error: unknown): unknown {
  if (error instanceof StripeApiError || !isStripeError(error)) {
    return error
  }
  const details = [
    error.code && `code=${error.code}`,
    error.decline_code && `decline_code=${error.decline_code}`,
    error.requestId && `request_id=${error.requestId}`,
  ].filter(Boolean)
  return new StripeApiError(
    medusaTypeFor(error.type),
    `Stripe ${operation} failed: ${error.message ?? "unknown error"}${details.length ? ` ${details.join(" ")}` : ""}`,
    {
      stripeType: error.type,
      stripeCode: error.code,
      declineCode: error.decline_code,
      requestId: error.requestId,
      statusCode: error.statusCode,
      paymentIntent: error.payment_intent,
    }
  )
}

type StripeResponseLike = {
  id?: string
  object?: string
  status?: string | null
  lastResponse?: { requestId?: string; statusCode?: number }
}

/**
 * Runs one Stripe call with `debug` logs around it. The logs carry the operation, the ids passed in
 * and the response's id, status and request id: never the request body, a key, a client secret or
 * a customer's details.
 */
export async function callStripe<T>(
  logger: Logger,
  operation: string,
  ids: Record<string, string | undefined>,
  call: () => Promise<T>
): Promise<T> {
  const known = Object.fromEntries(Object.entries(ids).filter(([, value]) => value !== undefined))
  logger.debug(`StripeClient.${operation} request: ${JSON.stringify(known)}`)
  try {
    const response = await call()
    const meta = (response ?? {}) as StripeResponseLike
    logger.debug(
      `StripeClient.${operation} response: ${JSON.stringify({
        id: meta.id,
        object: meta.object,
        status: meta.status ?? undefined,
        request_id: meta.lastResponse?.requestId,
      })}`
    )
    return response
  } catch (error) {
    const failure = toStripeError(operation, error)
    logger.debug(
      `StripeClient.${operation} error: ${
        failure instanceof StripeApiError
          ? JSON.stringify({ type: failure.stripeType, code: failure.stripeCode, request_id: failure.requestId })
          : (failure as Error)?.message ?? String(failure)
      }`
    )
    throw failure
  }
}
