import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { Client } from "mollie-api-typescript"
import {
  ConnectionError,
  ErrorResponse,
  RequestAbortedError,
  RequestTimeoutError,
  ResponseValidationError,
  SDKValidationError,
} from "mollie-api-typescript/models/errors"

export const MOLLIE_TIMEOUT_MS = 30_000

const PACKAGE_NAME = "@gorgo/medusa-payment-mollie"

/** The version of this package, read from its `package.json` both in `src` and in the build. */
function packageVersion(): string {
  let dir = __dirname
  for (let depth = 0; depth < 8; depth++) {
    const file = path.join(dir, "package.json")
    if (existsSync(file)) {
      try {
        const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; version?: string }
        if (pkg.name === PACKAGE_NAME && pkg.version) {
          return pkg.version
        }
      } catch {
        // an unreadable package.json higher up is not ours
      }
    }
    dir = path.dirname(dir)
  }
  return "0.0.0"
}

/**
 * The integration's name in Mollie's logs. Mollie asks partners for a stable `Name/x.x.x` token
 * (docs: "Integration partners: User agent strings"). The SDK writes its own User-Agent and appends
 * only `customUserAgent` to it; its `userAgent` option is overwritten.
 */
export const MOLLIE_USER_AGENT = `GorgoMedusaMollie/${packageVersion()}`

// One client per API key: the provider resolves its settings on every call, and the SDK keeps its
// HTTP client on the instance.
const clients = new Map<string, Client>()

/**
 * The Mollie SDK client for an API key. Neither `testmode` nor `profileId` is passed: with an API
 * key the key itself picks the profile and the mode, and Mollie rejects both parameters.
 *
 * The SDK retries 429, 5xx and dropped connections on its own, POST requests included, so every
 * POST this package makes carries an `idempotencyKey`: a retried request then never creates a
 * second payment, capture or refund.
 */
export function getMollie(apiKey: string): Client {
  let client = clients.get(apiKey)
  if (!client) {
    client = new Client({
      security: { apiKey },
      timeoutMs: MOLLIE_TIMEOUT_MS,
      customUserAgent: MOLLIE_USER_AGENT,
    })
    clients.set(apiKey, client)
  }
  return client
}

/** Drops every cached client. For tests and for a changed API key. */
export function clearMollieClients() {
  clients.clear()
}

/** A Mollie API failure, carrying Mollie's error fields next to Medusa's error type. */
export class MollieApiError extends MedusaError {
  /** The HTTP status Mollie answered with, absent for a timeout or a dropped connection. */
  readonly status?: number
  readonly title?: string
  readonly detail?: string
  /** The request field Mollie blamed, on a 422. */
  readonly field?: string

  constructor(
    type: string,
    message: string,
    fields: { status?: number; title?: string; detail?: string; field?: string }
  ) {
    super(type, message, fields.status ? `mollie_${fields.status}` : "mollie_unreachable")
    this.status = fields.status
    this.title = fields.title
    this.detail = fields.detail
    this.field = fields.field
  }
}

function medusaTypeFor(status: number): string {
  if (status === 401 || status === 403) {
    return MedusaError.Types.UNAUTHORIZED
  }
  if (status === 404 || status === 410) {
    return MedusaError.Types.NOT_FOUND
  }
  if (status === 409) {
    return MedusaError.Types.CONFLICT
  }
  if (status === 400 || status === 422) {
    return MedusaError.Types.INVALID_DATA
  }
  return MedusaError.Types.UNEXPECTED_STATE
}

/**
 * Turns an SDK error into a `MollieApiError` with Mollie's own wording, so a merchant reads in
 * Admin what Mollie said. Anything that is not an SDK error passes through.
 */
export function toMollieError(operation: string, error: unknown, logger?: Logger): unknown {
  if (error instanceof MollieApiError) {
    return error
  }
  if (error instanceof ErrorResponse) {
    const field = error.field ? ` field=${error.field}` : ""
    return new MollieApiError(
      medusaTypeFor(error.status),
      `Mollie ${operation} failed: ${error.detail || error.title} (${error.status}${field})`,
      { status: error.status, title: error.title, detail: error.detail, field: error.field }
    )
  }
  if (error instanceof ResponseValidationError) {
    // the SDK checks every response against its schema: a field Mollie changed breaks it here
    logger?.warn(
      `MollieClient.${operation}: the response did not match mollie-api-typescript's schema, the SDK may be older than the API: ${error.message}`
    )
    return new MollieApiError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Mollie ${operation} returned a response this version cannot read`,
      { status: error.statusCode }
    )
  }
  if (error instanceof SDKValidationError) {
    return new MollieApiError(MedusaError.Types.INVALID_DATA, `Mollie ${operation} got an invalid request: ${error.message}`, {})
  }
  if (error instanceof RequestTimeoutError || error instanceof RequestAbortedError || error instanceof ConnectionError) {
    return new MollieApiError(MedusaError.Types.UNEXPECTED_STATE, `Mollie ${operation} failed: ${error.message}`, {})
  }
  return error
}

type MollieResponseLike = {
  id?: string
  resource?: string
  status?: string
  mode?: string
}

/**
 * Runs one Mollie call with `debug` logs around it. The logs carry the operation, the ids passed in
 * and the response's id, status and mode: never the API key, the request body, an address or an
 * email.
 */
export async function callMollie<T>(
  logger: Logger,
  operation: string,
  ids: Record<string, string | undefined>,
  call: () => Promise<T>
): Promise<T> {
  const known = Object.fromEntries(Object.entries(ids).filter(([, value]) => value !== undefined))
  logger.debug(`MollieClient.${operation} request: ${JSON.stringify(known)}`)
  try {
    const response = await call()
    const meta = (response ?? {}) as MollieResponseLike
    logger.debug(
      `MollieClient.${operation} response: ${JSON.stringify({
        id: meta.id,
        resource: meta.resource,
        status: meta.status,
        mode: meta.mode,
      })}`
    )
    return response
  } catch (error) {
    const failure = toMollieError(operation, error, logger)
    logger.debug(
      `MollieClient.${operation} error: ${
        failure instanceof MollieApiError
          ? JSON.stringify({ status: failure.status, title: failure.title, field: failure.field })
          : ((failure as Error)?.message ?? String(failure))
      }`
    )
    throw failure
  }
}
