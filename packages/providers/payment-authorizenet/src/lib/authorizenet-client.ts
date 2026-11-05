import { randomUUID } from "node:crypto"
import { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  AnetCreateTransactionResponse,
  AnetCreditCard,
  AnetEnvironment,
  AnetGetMerchantDetailsResponse,
  AnetGetTransactionDetailsResponse,
  AnetMessages,
  AnetOpaqueData,
  AnetSecurePaymentContainerResponse,
  AnetTransactionRequest,
  AnetTransactionResponse,
  AnetWebhook,
} from "../types"

export const AUTHORIZENET_ENDPOINTS: Record<AnetEnvironment, { api: string; rest: string }> = {
  sandbox: {
    api: "https://apitest.authorize.net/xml/v1/request.api",
    rest: "https://apitest.authorize.net/rest/v1",
  },
  production: {
    api: "https://api.authorize.net/xml/v1/request.api",
    rest: "https://api.authorize.net/rest/v1",
  },
}

export const AUTHORIZENET_TIMEOUT_MS = 30_000

export type AuthorizeNetClientOptions = {
  environment: AnetEnvironment
  apiLoginId: string
  transactionKey: string
  logger: Logger
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number
  /** Attempts for a read, including the first one. A transaction is never repeated. */
  attempts?: number
  /** Delay before the first repeat; each next one is three times longer. */
  retryBaseDelayMs?: number
  /** For tests. */
  fetch?: typeof fetch
}

/** An Authorize.net failure, carrying the gateway's codes next to Medusa's error type. */
export class AuthorizeNetApiError extends MedusaError {
  /** `messages.resultCode` of the response, when there was one. */
  readonly resultCode?: string
  /** `transactionResponse.responseCode`: 2 declined, 3 error. */
  readonly responseCode?: string
  /** The first message code (`E00027`) or transaction error code (`2`, `54`, `311`). */
  readonly anetCode?: string
  readonly transactionResponse?: AnetTransactionResponse
  readonly httpStatus?: number

  constructor(
    type: string,
    message: string,
    fields: {
      resultCode?: string
      responseCode?: string
      anetCode?: string
      transactionResponse?: AnetTransactionResponse
      httpStatus?: number
    } = {}
  ) {
    super(type, message, fields.anetCode)
    this.resultCode = fields.resultCode
    this.responseCode = fields.responseCode
    this.anetCode = fields.anetCode
    this.transactionResponse = fields.transactionResponse
    this.httpStatus = fields.httpStatus
  }
}

const UNAUTHORIZED_CODES = new Set(["E00007", "E00008", "E00011"])
const INVALID_DATA_CODES = new Set(["E00003", "E00013"])

/**
 * Turns an `Error` response into an `AuthorizeNetApiError`. A transaction the bank declined or the
 * gateway refused carries its reason in `transactionResponse.errors`; everything else in
 * `messages.message`.
 */
export function toAuthorizeNetError(
  operation: string,
  response: { messages?: AnetMessages; transactionResponse?: AnetTransactionResponse }
): AuthorizeNetApiError {
  const transaction = response.transactionResponse
  const transactionError = asArray(transaction?.errors)[0]
  const message = asArray(response.messages?.message)[0]
  const responseCode = transaction?.responseCode
  const anetCode = transactionError?.errorCode ?? message?.code
  const text = transactionError?.errorText ?? message?.text ?? "unknown error"

  let type: string = MedusaError.Types.UNEXPECTED_STATE
  if (transactionError && (responseCode === "2" || responseCode === "3")) {
    type = MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR
  } else if (message && UNAUTHORIZED_CODES.has(message.code)) {
    type = MedusaError.Types.UNAUTHORIZED
  } else if (message && INVALID_DATA_CODES.has(message.code)) {
    type = MedusaError.Types.INVALID_DATA
  }

  const details = [anetCode && `code=${anetCode}`, responseCode && `responseCode=${responseCode}`].filter(Boolean)
  return new AuthorizeNetApiError(
    type,
    `Authorize.net ${operation} failed: ${text}${details.length ? ` ${details.join(" ")}` : ""}`,
    {
      resultCode: response.messages?.resultCode,
      responseCode,
      anetCode,
      transactionResponse: transaction,
    }
  )
}

/** Repeated elements come back as an array or, sometimes, as a single object. */
export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

class TransportError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly httpStatus?: number
  ) {
    super(message)
  }
}

/** `AbortSignal.timeout` rejects with a `DOMException`, which is not always an `instanceof Error`. */
function isTimeout(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name
  return name === "TimeoutError" || name === "AbortError"
}

/** The response of a transaction the gateway accepted: approved (1) or held for review (4). */
export type AnetTransactionResult = {
  refId?: string
  responseCode: "1" | "4"
  transactionResponse: AnetTransactionResponse
}

type RequestMeta = {
  /** Safe to repeat: reads only. */
  idempotent: boolean
  /** What goes into the debug log. Never keys, tokens, card numbers or the buyer's details. */
  summary: Record<string, string | undefined>
}

/**
 * The one client every Authorize.net call goes through: the XML-over-JSON endpoint for payments and
 * reports, and the REST endpoint for webhooks. It adds the merchant authentication, the timeout,
 * repeats for reads, error conversion and logs.
 */
export class AuthorizeNetClient {
  protected readonly logger_: Logger
  protected readonly endpoints: { api: string; rest: string }
  protected readonly timeoutMs: number
  protected readonly attempts: number
  protected readonly retryBaseDelayMs: number
  protected readonly fetch_: typeof fetch

  constructor(protected readonly options: AuthorizeNetClientOptions) {
    this.logger_ = options.logger
    this.endpoints = AUTHORIZENET_ENDPOINTS[options.environment]
    this.timeoutMs = options.timeoutMs ?? AUTHORIZENET_TIMEOUT_MS
    this.attempts = Math.max(1, options.attempts ?? 3)
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 500
    this.fetch_ = options.fetch ?? fetch
  }

  /**
   * Runs a payment transaction. Resolves for an approved (1) or held (4) transaction and throws
   * `AuthorizeNetApiError` for everything else. Never repeated: a transaction sent twice can charge
   * twice, and Authorize.net has no idempotency key.
   */
  async createTransaction(transactionRequest: AnetTransactionRequest, refId?: string): Promise<AnetTransactionResult> {
    const operation = "createTransaction"
    const response = await this.request<AnetCreateTransactionResponse>(
      "createTransactionRequest",
      { transactionRequest },
      refId,
      {
        idempotent: false,
        summary: {
          refId,
          transactionType: transactionRequest.transactionType,
          refTransId: transactionRequest.refTransId,
          amount: transactionRequest.amount,
          currencyCode: transactionRequest.currencyCode,
        },
      }
    )
    const transaction = response.transactionResponse
    const responseCode = transaction?.responseCode
    if (response.messages?.resultCode !== "Ok" || !transaction || (responseCode !== "1" && responseCode !== "4")) {
      throw toAuthorizeNetError(operation, response)
    }
    return { refId: response.refId, responseCode, transactionResponse: transaction }
  }

  async getTransactionDetails(transId: string): Promise<AnetGetTransactionDetailsResponse> {
    const response = await this.request<AnetGetTransactionDetailsResponse>(
      "getTransactionDetailsRequest",
      { transId },
      undefined,
      { idempotent: true, summary: { transId } }
    )
    return this.ensureOk("getTransactionDetails", response)
  }

  async getMerchantDetails(): Promise<AnetGetMerchantDetailsResponse> {
    const response = await this.request<AnetGetMerchantDetailsResponse>("getMerchantDetailsRequest", {}, undefined, {
      idempotent: true,
      summary: {},
    })
    return this.ensureOk("getMerchantDetails", response)
  }

  async authenticateTest(): Promise<void> {
    const response = await this.request<{ messages: AnetMessages }>("authenticateTestRequest", {}, undefined, {
      idempotent: true,
      summary: {},
    })
    this.ensureOk("authenticateTest", response)
  }

  /**
   * Turns card data into a one-time `opaqueData` token on the server. Used by the sandbox contract
   * tests in place of Accept.js in a browser; the storefront never calls it.
   */
  async securePaymentContainer(card: AnetCreditCard): Promise<AnetOpaqueData> {
    const response = await this.request<AnetSecurePaymentContainerResponse>(
      "securePaymentContainerRequest",
      { data: { type: "TOKEN", id: randomUUID(), token: card } },
      undefined,
      { idempotent: false, summary: {} }
    )
    const ok = this.ensureOk("securePaymentContainer", response)
    if (!ok.opaqueData?.dataValue) {
      throw new AuthorizeNetApiError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Authorize.net securePaymentContainer failed: no opaqueData in the response"
      )
    }
    return { dataDescriptor: ok.opaqueData.dataDescriptor, dataValue: ok.opaqueData.dataValue }
  }

  /** The account's webhooks, from the REST API. */
  async listWebhooks(): Promise<AnetWebhook[]> {
    const operation = "listWebhooks"
    const url = `${this.endpoints.rest}/webhooks`
    const credentials = Buffer.from(`${this.options.apiLoginId}:${this.options.transactionKey}`).toString("base64")
    const body = await this.send<AnetWebhook[] | { webhooks?: AnetWebhook[] }>(
      operation,
      { idempotent: true, summary: {} },
      () =>
        this.fetch_(url, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `Basic ${credentials}` },
          signal: AbortSignal.timeout(this.timeoutMs),
        })
    )
    return Array.isArray(body) ? body : asArray(body?.webhooks)
  }

  protected ensureOk<T extends { messages?: AnetMessages }>(operation: string, response: T): T {
    if (response.messages?.resultCode !== "Ok") {
      throw toAuthorizeNetError(operation, response)
    }
    return response
  }

  /** Wraps a body in the envelope every request shares: `merchantAuthentication`, then `refId`. */
  protected envelope(root: string, body: Record<string, unknown>, refId?: string) {
    return {
      [root]: {
        merchantAuthentication: {
          name: this.options.apiLoginId,
          transactionKey: this.options.transactionKey,
        },
        ...(refId ? { refId } : {}),
        ...body,
      },
    }
  }

  protected async request<T extends { messages?: AnetMessages }>(
    root: string,
    body: Record<string, unknown>,
    refId: string | undefined,
    meta: RequestMeta
  ): Promise<T> {
    const operation = root.replace(/Request$/, "")
    const payload = JSON.stringify(this.envelope(root, body, refId))
    const response = await this.send<T>(operation, meta, () =>
      this.fetch_(this.endpoints.api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: payload,
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    )
    const transaction = (response as { transactionResponse?: AnetTransactionResponse }).transactionResponse
    this.logger_.debug(
      `AuthorizeNetClient.${operation} response: ${JSON.stringify({
        resultCode: response.messages?.resultCode,
        codes: asArray(response.messages?.message).map((m) => m.code),
        responseCode: transaction?.responseCode,
        transId: transaction?.transId,
        errors: asArray(transaction?.errors).map((e) => e.errorCode),
      })}`
    )
    return response
  }

  /** One HTTP exchange with repeats for reads, returning the parsed JSON body. */
  protected async send<T>(operation: string, meta: RequestMeta, call: () => Promise<Response>): Promise<T> {
    const known = Object.fromEntries(Object.entries(meta.summary).filter(([, value]) => value !== undefined))
    this.logger_.debug(`AuthorizeNetClient.${operation} request: ${JSON.stringify(known)}`)

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.exchange<T>(call)
      } catch (error) {
        const transport = error instanceof TransportError ? error : null
        if (meta.idempotent && transport?.retryable && attempt < this.attempts) {
          const delay = this.retryBaseDelayMs * 3 ** (attempt - 1)
          this.logger_.warn(
            `AuthorizeNetClient.${operation} attempt ${attempt} failed, retrying in ${delay} ms: ${transport.message}`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        const failure = transport
          ? new AuthorizeNetApiError(
              MedusaError.Types.UNEXPECTED_STATE,
              `Authorize.net ${operation} failed: ${transport.message}${
                meta.idempotent ? "" : ". The outcome is unknown: check the transaction in the Merchant Interface"
              }`,
              { httpStatus: transport.httpStatus }
            )
          : error
        this.logger_.debug(`AuthorizeNetClient.${operation} failed: ${(failure as Error)?.message ?? String(failure)}`)
        throw failure
      }
    }
  }

  protected async exchange<T>(call: () => Promise<Response>): Promise<T> {
    let response: Response
    try {
      response = await call()
    } catch (error) {
      throw new TransportError(
        isTimeout(error) ? `timed out after ${this.timeoutMs} ms` : `network error: ${(error as Error)?.message}`,
        true
      )
    }
    const raw = await response.text().catch(() => "")
    if (!response.ok) {
      throw new TransportError(
        `HTTP ${response.status}`,
        response.status >= 500 || response.status === 429,
        response.status
      )
    }
    // The JSON endpoint starts its responses with a UTF-8 byte order mark.
    const text = raw.replace(/^\uFEFF/, "")
    try {
      return JSON.parse(text) as T
    } catch {
      throw new TransportError("the response is not JSON", false, response.status)
    }
  }
}
