import { createHash } from "node:crypto"
import axios, { AxiosInstance, AxiosResponse, RawAxiosRequestConfig } from "axios"
import { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  Configuration as OrdersConfiguration,
  OrdersApi,
  type Order,
  type OrderAuthorizeResponse,
  type OrderRequest,
  type Patch,
} from "./paypal-orders-client"
import {
  Configuration as PaymentsConfiguration,
  AuthorizationsApi,
  CapturesApi,
  type Authorization2,
  type Capture2,
  type CaptureRequest,
  type Refund,
  type RefundRequest,
} from "./paypal-payments-client"
import {
  Configuration as WebhooksConfiguration,
  VerifyWebhookSignatureApi,
  WebhooksApi,
  type VerifyWebhookSignature,
  type VerifyWebhookSignatureResponse,
  type Webhook,
} from "./paypal-webhooks-client"

export type PayPalEnvironment = "sandbox" | "live"

export const PAYPAL_BASE_URLS: Record<PayPalEnvironment, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
}

export type PayPalClientOptions = {
  clientId: string
  clientSecret: string
  environment: PayPalEnvironment
  logger: Logger
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number
  /** Attempts for a retryable call, including the first one. */
  attempts?: number
  /** Base of the exponential backoff between attempts, in milliseconds. */
  retryBaseDelayMs?: number
}

export type PayPalCallOptions = {
  /** Sandbox-only negative testing: sent as `PayPal-Mock-Response`. Ignored in live. */
  mockResponse?: string
}

export type PayPalErrorDetail = { issue?: string; description?: string; field?: string }

/** A PayPal API failure, carrying the vendor's error fields next to Medusa's error type. */
export class PayPalApiError extends MedusaError {
  readonly status?: number
  readonly debugId?: string
  readonly issue?: string
  readonly details: PayPalErrorDetail[]
  /** The PayPal response body, for decline parsing. */
  readonly data?: unknown

  constructor(
    type: string,
    message: string,
    fields: { status?: number; debugId?: string; issue?: string; details?: PayPalErrorDetail[]; data?: unknown; code?: string }
  ) {
    super(type, message, fields.code)
    this.status = fields.status
    this.debugId = fields.debugId
    this.issue = fields.issue
    this.details = fields.details ?? []
    this.data = fields.data
  }
}

type CachedCredential = { value: string; expiresAt: number }

// Shared across client instances: the provider builds a client per call, and one
// credential per PayPal app and environment is enough.
const credentialCache = new Map<string, CachedCredential>()
const inflightCredentials = new Map<string, Promise<string>>()

/** Drops every cached OAuth credential. For tests and for a changed secret. */
export function clearPayPalCredentialCache() {
  credentialCache.clear()
  inflightCredentials.clear()
}

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNABORTED",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ERR_NETWORK",
])

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }
  if (!error.response) {
    return RETRYABLE_NETWORK_CODES.has(error.code ?? "")
  }
  return error.response.status >= 500 || error.response.status === 429
}

function errorTypeFor(status?: number): string {
  if (status === 400 || status === 422) {
    return MedusaError.Types.INVALID_DATA
  }
  if (status === 401 || status === 403) {
    return MedusaError.Types.UNAUTHORIZED
  }
  return MedusaError.Types.UNEXPECTED_STATE
}

type PayPalErrorBody = {
  name?: string
  message?: string
  debug_id?: string
  details?: PayPalErrorDetail[]
  // OAuth endpoints answer with this shape instead.
  error?: string
  error_description?: string
}

/** Converts whatever a PayPal call threw into a PayPalApiError. */
export function toPayPalError(operation: string, error: unknown): PayPalApiError {
  if (error instanceof PayPalApiError) {
    return error
  }
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new PayPalApiError(
        MedusaError.Types.UNEXPECTED_STATE,
        `PayPal ${operation} failed: ${error.code ?? error.message}`,
        { code: error.code }
      )
    }
    const status = error.response.status
    const body = (error.response.data ?? {}) as PayPalErrorBody
    const details = Array.isArray(body.details) ? body.details : []
    const issue = details[0]?.issue
    const name = body.name ?? body.error
    const debugId = body.debug_id ?? (error.response.headers?.["paypal-debug-id"] as string | undefined)
    const parts = [name, issue, body.error_description].filter(Boolean).join(" ")
    return new PayPalApiError(
      errorTypeFor(status),
      `PayPal ${operation} failed: ${parts || `HTTP ${status}`}${debugId ? ` debug_id=${debugId}` : ""}`,
      { status, debugId, issue, details, data: body, code: issue ?? name }
    )
  }
  const message = error instanceof Error ? error.message : String(error)
  return new PayPalApiError(MedusaError.Types.UNEXPECTED_STATE, `PayPal ${operation} failed: ${message}`, {})
}

type CallMeta = {
  method: string
  path: string
  /** Safe to repeat: a GET, or a call PayPal deduplicates by `PayPal-Request-Id`. */
  idempotent: boolean
  requestId?: string
  options?: PayPalCallOptions
}

/**
 * The one client every PayPal call goes through. The REST calls are the
 * typescript-axios clients generated from PayPal's specs; this class adds what the
 * specs leave out: the OAuth credential, retries, error conversion and logging.
 */
export class PayPalClient {
  protected readonly logger_: Logger
  protected readonly environment: PayPalEnvironment
  protected readonly baseUrl: string
  protected readonly http: AxiosInstance
  protected readonly attempts: number
  protected readonly retryBaseDelayMs: number
  protected readonly cacheKey: string

  protected readonly orders: OrdersApi
  protected readonly authorizations: AuthorizationsApi
  protected readonly captures: CapturesApi
  protected readonly webhookSignatures: VerifyWebhookSignatureApi
  protected readonly webhooks: WebhooksApi

  constructor(protected readonly options: PayPalClientOptions) {
    this.logger_ = options.logger
    this.environment = options.environment
    this.baseUrl = PAYPAL_BASE_URLS[options.environment]
    this.attempts = Math.max(1, options.attempts ?? 3)
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 500
    this.http = axios.create()
    // The secret is part of the key, so a credential minted with an old secret is
    // never served after the merchant changes it.
    const secretHash = createHash("sha256").update(options.clientSecret).digest("hex").slice(0, 16)
    this.cacheKey = `${options.environment}:${options.clientId}:${secretHash}`

    // Orders and Payments specs list only the live server, so the base URL always
    // comes from the environment.
    const configuration = {
      basePath: this.baseUrl,
      accessToken: () => this.getAccessToken(),
      baseOptions: { timeout: options.timeoutMs ?? 30_000 },
    }
    this.orders = new OrdersApi(new OrdersConfiguration(configuration), undefined, this.http)
    const payments = new PaymentsConfiguration(configuration)
    this.authorizations = new AuthorizationsApi(payments, undefined, this.http)
    this.captures = new CapturesApi(payments, undefined, this.http)
    const webhooks = new WebhooksConfiguration(configuration)
    this.webhookSignatures = new VerifyWebhookSignatureApi(webhooks, undefined, this.http)
    this.webhooks = new WebhooksApi(webhooks, undefined, this.http)
  }

  createOrder(body: OrderRequest, requestId: string, options?: PayPalCallOptions): Promise<Order> {
    return this.call(
      "createOrder",
      { method: "POST", path: "/v2/checkout/orders", idempotent: true, requestId, options },
      (axiosOptions) =>
        this.orders.ordersCreate(
          { orderRequest: body, payPalRequestId: requestId, prefer: "return=representation" },
          axiosOptions
        )
    )
  }

  getOrder(orderId: string, options?: PayPalCallOptions): Promise<Order> {
    return this.call(
      "getOrder",
      { method: "GET", path: `/v2/checkout/orders/${orderId}`, idempotent: true, options },
      (axiosOptions) => this.orders.ordersGet({ id: orderId }, axiosOptions)
    )
  }

  /** PATCH carries no `PayPal-Request-Id`, so it is never retried. */
  patchOrder(orderId: string, patch: Patch[], options?: PayPalCallOptions): Promise<void> {
    return this.call(
      "patchOrder",
      { method: "PATCH", path: `/v2/checkout/orders/${orderId}`, idempotent: false, options },
      (axiosOptions) => this.orders.ordersPatch({ id: orderId, patch }, axiosOptions)
    )
  }

  authorizeOrder(orderId: string, requestId: string, options?: PayPalCallOptions): Promise<OrderAuthorizeResponse> {
    return this.call(
      "authorizeOrder",
      { method: "POST", path: `/v2/checkout/orders/${orderId}/authorize`, idempotent: true, requestId, options },
      (axiosOptions) =>
        this.orders.ordersAuthorize(
          { id: orderId, payPalRequestId: requestId, prefer: "return=representation" },
          axiosOptions
        )
    )
  }

  captureOrder(orderId: string, requestId: string, options?: PayPalCallOptions): Promise<Order> {
    return this.call(
      "captureOrder",
      { method: "POST", path: `/v2/checkout/orders/${orderId}/capture`, idempotent: true, requestId, options },
      (axiosOptions) =>
        this.orders.ordersCapture(
          { id: orderId, payPalRequestId: requestId, prefer: "return=representation" },
          axiosOptions
        )
    )
  }

  captureAuthorization(
    authorizationId: string,
    body: CaptureRequest,
    requestId: string,
    options?: PayPalCallOptions
  ): Promise<Capture2> {
    return this.call(
      "captureAuthorization",
      {
        method: "POST",
        path: `/v2/payments/authorizations/${authorizationId}/capture`,
        idempotent: true,
        requestId,
        options,
      },
      (axiosOptions) =>
        this.authorizations.authorizationsCapture(
          { authorizationId, captureRequest: body, payPalRequestId: requestId, prefer: "return=representation" },
          axiosOptions
        )
    )
  }

  voidAuthorization(authorizationId: string, requestId: string, options?: PayPalCallOptions): Promise<Authorization2> {
    return this.call(
      "voidAuthorization",
      {
        method: "POST",
        path: `/v2/payments/authorizations/${authorizationId}/void`,
        idempotent: true,
        requestId,
        options,
      },
      (axiosOptions) =>
        this.authorizations.authorizationsVoid(
          { authorizationId, payPalRequestId: requestId, prefer: "return=representation" },
          axiosOptions
        )
    )
  }

  refundCapture(captureId: string, body: RefundRequest, requestId: string, options?: PayPalCallOptions): Promise<Refund> {
    return this.call(
      "refundCapture",
      { method: "POST", path: `/v2/payments/captures/${captureId}/refund`, idempotent: true, requestId, options },
      (axiosOptions) =>
        this.captures.capturesRefund(
          { captureId, refundRequest: body, payPalRequestId: requestId, prefer: "return=representation" },
          axiosOptions
        )
    )
  }

  /** Signature verification changes nothing on PayPal's side, so it is safe to retry. */
  /**
   * Asks PayPal to check a webhook signature. The event goes into the body as the raw text PayPal
   * sent: parsing and re-serializing it can change escapes and break the signature. The generated
   * client sends a string body as is.
   */
  verifyWebhookSignature(
    fields: Omit<VerifyWebhookSignature, "webhook_event">,
    rawEvent: string
  ): Promise<VerifyWebhookSignatureResponse> {
    const body = `${JSON.stringify(fields).slice(0, -1)},"webhook_event":${rawEvent}}`
    return this.call(
      "verifyWebhookSignature",
      { method: "POST", path: "/v1/notifications/verify-webhook-signature", idempotent: true },
      (axiosOptions) =>
        this.webhookSignatures.verifyWebhookSignaturePost(
          { verifyWebhookSignature: body as unknown as VerifyWebhookSignature },
          axiosOptions
        )
    )
  }

  getWebhook(webhookId: string): Promise<Webhook> {
    return this.call(
      "getWebhook",
      { method: "GET", path: `/v1/notifications/webhooks/${webhookId}`, idempotent: true },
      (axiosOptions) => this.webhooks.webhooksGet({ webhookId }, axiosOptions)
    )
  }

  /** The OAuth credential for the REST calls, cached until two minutes before it expires. */
  getAccessToken(): Promise<string> {
    return this.cachedGrant(this.cacheKey, new URLSearchParams({ grant_type: "client_credentials" }), "oauth")
  }

  protected cachedGrant(key: string, params: URLSearchParams, operation: string): Promise<string> {
    const cached = credentialCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.value)
    }
    const inflight = inflightCredentials.get(key)
    if (inflight) {
      return inflight
    }
    const request = this.call<{ access_token: string; expires_in: number }>(
      operation,
      { method: "POST", path: "/v1/oauth2/token", idempotent: true },
      (axiosOptions) =>
        this.http.post(`${this.baseUrl}/v1/oauth2/token`, params.toString(), {
          ...axiosOptions,
          timeout: this.options.timeoutMs ?? 30_000,
          auth: { username: this.options.clientId, password: this.options.clientSecret },
          headers: { ...axiosOptions.headers, "Content-Type": "application/x-www-form-urlencoded" },
        })
    )
      .then(({ access_token, expires_in }) => {
        const lifetime = Math.max(expires_in - 120, expires_in / 2)
        credentialCache.set(key, { value: access_token, expiresAt: Date.now() + lifetime * 1000 })
        return access_token
      })
      .finally(() => inflightCredentials.delete(key))
    inflightCredentials.set(key, request)
    return request
  }

  protected async call<T>(
    operation: string,
    meta: CallMeta,
    send: (axiosOptions: RawAxiosRequestConfig) => Promise<AxiosResponse<T>>
  ): Promise<T> {
    const axiosOptions: RawAxiosRequestConfig = {}
    if (meta.options?.mockResponse) {
      if (this.environment === "sandbox") {
        axiosOptions.headers = {
          "PayPal-Mock-Response": JSON.stringify({ mock_application_codes: meta.options.mockResponse }),
        }
      } else {
        this.logger_.warn(`PayPalClient.${operation}: mock response ignored outside the sandbox`)
      }
    }
    this.logger_.debug(
      `PayPalClient.${operation} request: ${JSON.stringify({ method: meta.method, path: meta.path, requestId: meta.requestId })}`
    )

    for (let attempt = 1; ; attempt++) {
      try {
        const response = await send(axiosOptions)
        this.logger_.debug(
          `PayPalClient.${operation} response: ${JSON.stringify({
            status: response.status,
            debugId: response.headers?.["paypal-debug-id"],
          })}`
        )
        return response.data
      } catch (error) {
        if (meta.idempotent && attempt < this.attempts && isRetryable(error)) {
          const delay = this.retryBaseDelayMs * 2 ** (attempt - 1)
          const failure = toPayPalError(operation, error)
          this.logger_.warn(`PayPalClient.${operation} attempt ${attempt} failed, retrying in ${delay} ms: ${failure.message}`)
          await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * delay))
          continue
        }
        const failure = toPayPalError(operation, error)
        this.logger_.debug(`PayPalClient.${operation} failed: ${failure.message}`)
        throw failure
      }
    }
  }
}
