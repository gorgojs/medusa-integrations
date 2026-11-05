import {
  AbstractPaymentProvider,
  MathBN,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { createTelemetryClient } from "@gorgo/telemetry"
import { resolveIntegrationOptions } from "@gorgo/medusa-integration"
import { AuthorizeNetApiError, AuthorizeNetClient } from "../../../lib/authorizenet-client"
import { buildTransactionRequest, toAnetBillTo, toAnetCustomer, toAnetShipTo } from "../../../lib/requests"
import { AnetTransactionDetails, AnetTransactionType, ProviderKeys } from "../../../types"
import { fromAnetAmount, toAnetAmount } from "../../../utils/amounts"
import {
  AuthorizeNetRefundRecord,
  AuthorizeNetSessionData,
  fromTransactionDetails,
  fromTransactionResponse,
  readOpaqueData,
  readTransId,
  scrubbed,
} from "../../../utils/payment-data"
import {
  AUTHORIZED_STATUSES,
  HELD_STATUSES,
  mapTransactionStatus,
  SETTLED_STATUSES,
  statusFromResponseCode,
  transactionStatusAfter,
  UNSETTLED_CAPTURED_STATUSES,
} from "../../../utils/status-map"
import {
  type AnetWebhookEvent,
  isSessionId,
  parseWebhookEvent,
  readRawBody,
  readSignature,
  SYNCHRONOUS_WEBHOOK_EVENTS,
  UNRECORDED_WEBHOOK_EVENTS,
  verifyAnetSignature,
  WEBHOOK_ACTIONS,
} from "../../../utils/webhook"
import { getAuthorizeNetCart, type AuthorizeNetCart } from "../../../workflows/get-authorizenet-cart"
import { getPaymentCollectionId } from "../../../workflows/get-payment-collection-id"
import type { AuthorizeNetOptions } from "../types"

/** The keys a storefront may put in the session data. Everything else is dropped. */
const SESSION_DATA_KEYS = new Set(["session_id", "opaque_data", "express"])

/**
 * The longest `refId` the XSD allows. A Medusa session id is 33 characters. The API reference says
 * 20; the sandbox probe of the plan's phase 2 settles which one the server enforces.
 */
export const REF_ID_MAX_LENGTH = 50

/**
 * A Medusa id as a `refId`. It fits as it is under the XSD's limit; under a shorter one the prefix
 * goes first (`payses_`), then the end of the ULID, keeping its timestamp and the start of its
 * random part.
 */
export function toRefId(id: string | undefined, max = REF_ID_MAX_LENGTH): string | undefined {
  if (!id) {
    return undefined
  }
  return id.length <= max ? id : id.replace(/^[a-z]+_/i, "").slice(0, max)
}

/** Session data as it may be logged: the token is replaced. */
function forLog(data: unknown) {
  if (!data || typeof data !== "object") {
    return data
  }
  const record = data as Record<string, unknown>
  return record.opaque_data ? { ...record, opaque_data: "[redacted]" } : record
}

function withoutEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== "")) as T
}

/** The session currency, also under the name the vendor's plugin used. */
function currencyOf(session: AuthorizeNetSessionData): string | undefined {
  const legacy = (session as Record<string, unknown>).currency
  return session.currency_code ?? (typeof legacy === "string" ? legacy : undefined)
}

abstract class AuthorizeNetBase extends AbstractPaymentProvider {
  protected logger_: Logger
  protected instanceId_: string | null
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  /**
   * Validate options passed to the provider.
   */
  static validateOptions(_options: Record<string, unknown>): void {
    AuthorizeNetBase.telemetry_.track("plugin.started")
  }

  constructor(container: { logger: Logger } & Record<string, any>, options?: Record<string, unknown>) {
    super(container, options)
    this.logger_ = container.logger
    this.instanceId_ = (options?.id as string | undefined) ?? null
  }

  /**
   * Resolve the merchant's Authorize.net settings from the integration module.
   */
  protected async resolveOptions(): Promise<AuthorizeNetOptions> {
    return resolveIntegrationOptions<AuthorizeNetOptions>({
      identifier: ProviderKeys.AUTHORIZENET,
      instance_id: this.instanceId_,
    })
  }

  protected getClient(options: AuthorizeNetOptions): AuthorizeNetClient {
    return new AuthorizeNetClient({
      environment: options.environment ?? "sandbox",
      apiLoginId: options.apiLoginId,
      transactionKey: options.transactionKey,
      logger: this.logger_,
    })
  }

  protected getPaymentCollectionId(sessionId: string): Promise<string> {
    return getPaymentCollectionId(sessionId)
  }

  protected getAuthorizeNetCart(collectionId: string): Promise<AuthorizeNetCart | null> {
    return getAuthorizeNetCart(collectionId)
  }

  /**
   * The cart behind a session, for the addresses and the email. A failed read never stops the
   * payment: the transaction goes without them, as a payment for an order edit does.
   */
  private async readCart(sessionId: string | undefined): Promise<AuthorizeNetCart | null> {
    if (!sessionId) {
      return null
    }
    try {
      return await this.getAuthorizeNetCart(await this.getPaymentCollectionId(sessionId))
    } catch (error) {
      this.logger_.warn(
        `AuthorizeNetBase.authorizePayment: could not read the cart of payment session ${sessionId}, sending the transaction without addresses: ${
          (error as { message?: string })?.message ?? String(error)
        }`
      )
      return null
    }
  }

  /**
   * Medusa calls this when a session is created. With the storefront's `deferred` flow that is the
   * pay button, right before the cart completes. No request goes to Authorize.net: the token is
   * kept for `authorizePayment`, and the amount and currency come from Medusa.
   */
  async initiatePayment({ amount, currency_code, data, context }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const input = (data ?? {}) as Record<string, unknown>
    const sessionId = input.session_id as string | undefined
    this.logger_.debug(
      `AuthorizeNetBase.initiatePayment input: ${JSON.stringify({
        amount,
        currency_code,
        session_id: sessionId,
        data_keys: Object.keys(input),
        idempotency_key: context?.idempotency_key,
      })}`
    )

    try {
      if (!sessionId) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "Authorize.net initiatePayment needs data.session_id")
      }
      const opaqueData = input.opaque_data === undefined ? undefined : readOpaqueData(input.opaque_data)
      if (input.opaque_data !== undefined && !opaqueData) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Authorize.net initiatePayment got an opaque_data token it does not accept"
        )
      }
      const dropped = Object.keys(input).filter((key) => !SESSION_DATA_KEYS.has(key))
      if (dropped.length) {
        this.logger_.debug(`AuthorizeNetBase.initiatePayment ignores session data keys: ${dropped.join(", ")}`)
      }

      const sessionData: AuthorizeNetSessionData = withoutEmpty({
        session_id: sessionId,
        amount: MathBN.convert(amount).toNumber(),
        currency_code: currency_code.toLowerCase(),
        opaque_data: opaqueData,
        express: input.express === true ? true : undefined,
      })
      // the dropped keys arrived in data and Medusa stores data merged with the output
      const output: InitiatePaymentOutput = {
        id: sessionId,
        status: PaymentSessionStatus.PENDING,
        data: { ...Object.fromEntries(dropped.map((key) => [key, null])), ...sessionData },
      }
      this.logger_.debug(`AuthorizeNetBase.initiatePayment output: ${JSON.stringify({ ...output, data: forLog(output.data) })}`)
      return output
    } catch (error) {
      throw this.fail("initiatePayment", error, { session_id: sessionId })
    }
  }

  /**
   * Called by Medusa at the end of `cart.complete`, and again by a webhook for a transaction the
   * Fraud Detection Suite held. With no transaction yet, it runs one with the token: `authCapture`
   * when the merchant captures right away, `authOnly` otherwise. With a transaction, it reads its
   * status. The token is written as `null` either way.
   */
  async authorizePayment({ data, context }: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const session = (data ?? {}) as AuthorizeNetSessionData
    this.logger_.debug(`AuthorizeNetBase.authorizePayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const sessionId = session.session_id ?? (context?.idempotency_key as string | undefined)
    const transId = readTransId(session as Record<string, unknown>)

    try {
      const options = await this.resolveOptions()
      const client = this.getClient(options)

      if (transId) {
        const details = await this.details(client, transId)
        const output = {
          status: mapTransactionStatus(details.transactionStatus),
          data: scrubbed(fromTransactionDetails(session, details), data),
        }
        this.logger_.debug(`AuthorizeNetBase.authorizePayment output: ${JSON.stringify(output)}`)
        return output
      }

      const opaqueData = readOpaqueData(session.opaque_data)
      if (!opaqueData) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Authorize.net authorizePayment needs the card token in data.opaque_data"
        )
      }
      const currency = currencyOf(session)
      if (session.amount === undefined || !currency) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "Authorize.net authorizePayment needs data.amount and data.currency_code")
      }

      const cart = await this.readCart(sessionId)
      const transactionType: AnetTransactionType =
        options.capture === "manual" ? "authOnlyTransaction" : "authCaptureTransaction"
      const request = buildTransactionRequest({
        transactionType,
        amount: toAnetAmount(session.amount, currency),
        currencyCode: currency,
        payment: { opaqueData },
        customer: toAnetCustomer(cart?.email),
        billTo: toAnetBillTo(cart?.billing_address ?? cart?.shipping_address),
        shipTo: toAnetShipTo(cart?.shipping_address),
        userFields: [
          sessionId ? { name: "medusa_session_id", value: sessionId } : undefined,
          cart?.id ? { name: "medusa_cart_id", value: cart.id } : undefined,
        ].filter((field): field is { name: string; value: string } => !!field),
      })

      const result = await client.createTransaction(request, toRefId(sessionId))
      const status = statusFromResponseCode(result.responseCode, transactionType)
      const held = result.responseCode === "4"
      const next = fromTransactionResponse(session, result.transactionResponse, {
        transactionStatus: transactionStatusAfter(result.responseCode, transactionType),
        held: held || undefined,
      })
      const output = { status, data: scrubbed(next, data) }

      if (held) {
        this.logger_.warn(
          `Authorize.net held transaction ${next.transId} for review for payment session ${sessionId}: the order waits for a decision in the Merchant Interface`
        )
      } else {
        this.logger_.info(`Authorize.net transaction ${next.transId} ${status} for payment session ${sessionId}`)
      }
      this.logger_.debug(`AuthorizeNetBase.authorizePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("authorizePayment", error, { session_id: sessionId, trans_id: transId })
    }
  }

  /**
   * Full capture only, as Stripe and PayPal: Medusa does not pass the amount of a capture. A
   * transaction captured already, by `authCapture` or in the Merchant Interface, is not captured again.
   */
  async capturePayment({ data, context }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const session = (data ?? {}) as AuthorizeNetSessionData
    this.logger_.debug(
      `AuthorizeNetBase.capturePayment input: ${JSON.stringify({ data: forLog(session), idempotency_key: context?.idempotency_key })}`
    )
    const transId = this.requireTransId(session, "capturePayment")

    try {
      const client = this.getClient(await this.resolveOptions())
      const details = await this.details(client, transId)
      const current = fromTransactionDetails(session, details)
      const status = details.transactionStatus

      if (mapTransactionStatus(status) === PaymentSessionStatus.CAPTURED) {
        return { data: scrubbed(current, data) }
      }
      if (HELD_STATUSES.has(status)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Authorize.net transaction ${transId} is held for review. Approve it in the Merchant Interface before capturing it.`
        )
      }
      if (!AUTHORIZED_STATUSES.has(status)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Authorize.net transaction ${transId} is ${status} and cannot be captured`
        )
      }

      let next: AuthorizeNetSessionData
      try {
        const result = await client.createTransaction(
          buildTransactionRequest({ transactionType: "priorAuthCaptureTransaction", refTransId: transId }),
          toRefId(context?.idempotency_key)
        )
        next = fromTransactionResponse(current, result.transactionResponse, {
          transId,
          transactionStatus: "capturedPendingSettlement",
        })
      } catch (error) {
        // a capture that went through before a lost response, or one made in the Merchant Interface
        const after = await this.details(client, transId)
        if (mapTransactionStatus(after.transactionStatus) !== PaymentSessionStatus.CAPTURED) {
          throw error
        }
        next = fromTransactionDetails(current, after)
      }

      this.logger_.info(`Authorize.net transaction ${transId} captured for payment session ${session.session_id}`)
      const output = { data: scrubbed(next, data) }
      this.logger_.debug(`AuthorizeNetBase.capturePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("capturePayment", error, { session_id: session.session_id, trans_id: transId })
    }
  }

  /**
   * After settlement, a refund to the card the payment was made with. Before settlement Authorize.net
   * takes no refund: a refund of the whole payment voids it, a partial one has to wait for settlement.
   * The payment's `transId` never changes; each refund is added to `refunds`.
   */
  async refundPayment({ data, amount, context }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = (data ?? {}) as AuthorizeNetSessionData
    const idempotencyKey = context?.idempotency_key
    this.logger_.debug(
      `AuthorizeNetBase.refundPayment input: ${JSON.stringify({ amount, idempotency_key: idempotencyKey, data: forLog(session) })}`
    )
    const transId = this.requireTransId(session, "refundPayment")
    const previous = session.refunds ?? []

    if (idempotencyKey && previous.some((refund) => refund.idempotency_key === idempotencyKey)) {
      return { data: scrubbed(session, data) }
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      const details = await this.details(client, transId)
      const current = fromTransactionDetails(session, details)
      const status = details.transactionStatus
      // a payment of the vendor's plugin kept no currency: the gateway then uses the account's
      const currency = currencyOf(session)
      const refundAmount = toAnetAmount(amount, currency ?? "USD")
      const record: AuthorizeNetRefundRecord = withoutEmpty({
        amount: MathBN.convert(amount).toNumber(),
        idempotency_key: idempotencyKey,
      }) as AuthorizeNetRefundRecord

      if (SETTLED_STATUSES.has(status)) {
        const last4 = current.card_last4
        if (!last4) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            `Authorize.net transaction ${transId} has no card number to refund to`
          )
        }
        const result = await client.createTransaction(
          buildTransactionRequest({
            transactionType: "refundTransaction",
            amount: refundAmount,
            currencyCode: currency,
            payment: { creditCard: { cardNumber: last4, expirationDate: "XXXX" } },
            refTransId: transId,
          }),
          toRefId(idempotencyKey)
        )
        record.transId = result.transactionResponse.transId
      } else if (UNSETTLED_CAPTURED_STATUSES.has(status)) {
        await this.voidBeforeSettlement(client, transId, details, previous, refundAmount, currency, idempotencyKey)
        record.voided = true
        current.transactionStatus = "voided"
      } else {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Authorize.net transaction ${transId} is ${status} and cannot be refunded`
        )
      }

      this.logger_.info(
        `Authorize.net ${record.voided ? "void" : `refund ${record.transId}`} of ${refundAmount}${currency ? ` ${currency.toUpperCase()}` : ""} for transaction ${transId}`
      )
      const output = { data: scrubbed({ ...current, transId, refunds: [...previous, record] }, data) }
      this.logger_.debug(`AuthorizeNetBase.refundPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("refundPayment", error, { session_id: session.session_id, trans_id: transId })
    }
  }

  /**
   * A refund of a captured, unsettled payment. Only a void of the whole transaction is possible, so
   * only a refund of the whole amount, with nothing refunded before, goes through.
   */
  private async voidBeforeSettlement(
    client: AuthorizeNetClient,
    transId: string,
    details: AnetTransactionDetails,
    previous: AuthorizeNetRefundRecord[],
    refundAmount: string,
    currency: string | undefined,
    idempotencyKey?: string
  ) {
    const captured = fromAnetAmount(details.settleAmount ?? details.authAmount)
    const whole =
      captured !== undefined && toAnetAmount(captured, currency ?? "USD") === refundAmount && !previous.length
    const notYet = `Authorize.net settles payments once a day, at the account's transaction cut-off time. Before that only the whole payment can be refunded`
    if (!whole) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `${notYet}. Refund the full amount now, or make this partial refund after settlement.`
      )
    }
    try {
      await client.createTransaction(
        buildTransactionRequest({ transactionType: "voidTransaction", refTransId: transId }),
        toRefId(idempotencyKey)
      )
    } catch (error) {
      if (error instanceof AuthorizeNetApiError) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `${notYet}, and Authorize.net refused to void it: ${error.message}. Refund it after settlement.`
        )
      }
      throw error
    }
  }

  /**
   * Voids an authorization, held ones included. A captured payment is refunded, not canceled, as
   * with Stripe: a cancel that gave the money back would be easy to trigger by mistake.
   */
  async cancelPayment({ data, context }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = (data ?? {}) as AuthorizeNetSessionData
    this.logger_.debug(`AuthorizeNetBase.cancelPayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const transId = readTransId(session as Record<string, unknown>)
    if (!transId) {
      return { data: scrubbed(session, data) }
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      const details = await this.details(client, transId)
      const current = fromTransactionDetails(session, details)
      const status = details.transactionStatus

      if (mapTransactionStatus(status) === PaymentSessionStatus.CAPTURED) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "A captured Authorize.net payment cannot be canceled. Refund it instead."
        )
      }
      if (AUTHORIZED_STATUSES.has(status) || HELD_STATUSES.has(status)) {
        await client.createTransaction(
          buildTransactionRequest({ transactionType: "voidTransaction", refTransId: transId }),
          toRefId(context?.idempotency_key)
        )
        current.transactionStatus = "voided"
        this.logger_.info(`Authorize.net transaction ${transId} voided for payment session ${session.session_id}`)
      }
      const output = { data: scrubbed(current, data) }
      this.logger_.debug(`AuthorizeNetBase.cancelPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("cancelPayment", error, { session_id: session.session_id, trans_id: transId })
    }
  }

  /**
   * Medusa deletes every session when the cart changes. A session that never reached Authorize.net
   * only loses its token; an authorization behind it is voided, so the buyer's funds are released.
   * Deleting a session never fails because of Authorize.net: the vendor's plugin threw here, and the
   * buyer could not switch to another payment method.
   */
  async deletePayment({ data }: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const session = (data ?? {}) as AuthorizeNetSessionData
    this.logger_.debug(`AuthorizeNetBase.deletePayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const transId = readTransId(session as Record<string, unknown>)
    if (!transId) {
      return { data: scrubbed(session, data) }
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      const details = await this.details(client, transId)
      const current = fromTransactionDetails(session, details)
      if (AUTHORIZED_STATUSES.has(details.transactionStatus) || HELD_STATUSES.has(details.transactionStatus)) {
        await client.createTransaction(buildTransactionRequest({ transactionType: "voidTransaction", refTransId: transId }))
        current.transactionStatus = "voided"
      }
      const output = { data: scrubbed(current, data) }
      this.logger_.debug(`AuthorizeNetBase.deletePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      this.logger_.warn(
        `AuthorizeNetBase.deletePayment could not void transaction ${transId}: ${(error as Error)?.message ?? String(error)}`
      )
      return { data: scrubbed(session, data) }
    }
  }

  /** Medusa never calls this: it replaces the session instead. */
  async updatePayment({ data }: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    this.logger_.debug(`AuthorizeNetBase.updatePayment input: ${JSON.stringify({ data: forLog(data) })}`)
    return { data: (data ?? {}) as Record<string, unknown> }
  }

  async getPaymentStatus({ data }: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const session = (data ?? {}) as AuthorizeNetSessionData
    this.logger_.debug(`AuthorizeNetBase.getPaymentStatus input: ${JSON.stringify({ data: forLog(session) })}`)
    const transId = readTransId(session as Record<string, unknown>)
    if (!transId) {
      return { status: PaymentSessionStatus.PENDING, data: session as Record<string, unknown> }
    }
    try {
      const details = await this.details(this.getClient(await this.resolveOptions()), transId)
      const output = {
        status: mapTransactionStatus(details.transactionStatus),
        data: scrubbed(fromTransactionDetails(session, details), data),
      }
      this.logger_.debug(`AuthorizeNetBase.getPaymentStatus output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("getPaymentStatus", error, { session_id: session.session_id, trans_id: transId })
    }
  }

  async retrievePayment({ data }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const session = (data ?? {}) as AuthorizeNetSessionData
    this.logger_.debug(`AuthorizeNetBase.retrievePayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const transId = this.requireTransId(session, "retrievePayment")
    try {
      const details = await this.details(this.getClient(await this.resolveOptions()), transId)
      const output = { data: scrubbed(fromTransactionDetails(session, details), data) }
      this.logger_.debug(`AuthorizeNetBase.retrievePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("retrievePayment", error, { session_id: session.session_id, trans_id: transId })
    }
  }

  /**
   * Maps a signed Authorize.net event to Medusa. `fraud.approved` authorizes the session of an order
   * that waited for review, and `priorAuthCapture.created` records a capture made in the Merchant
   * Interface. A repeated event changes nothing: authorization and capture are idempotent in Medusa.
   */
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const unsupported = { action: PaymentActions.NOT_SUPPORTED }
    const verified = await this.constructWebhookEvent(payload)
    const event = verified?.event
    const transId = event?.payload?.id
    this.logger_.debug(
      `AuthorizeNetBase.getWebhookActionAndData input: ${JSON.stringify({
        notification_id: event?.notificationId,
        event_type: event?.eventType,
        trans_id: transId,
      })}`
    )
    if (!verified || !event?.eventType) {
      return unsupported
    }

    const type = event.eventType
    if (UNRECORDED_WEBHOOK_EVENTS.has(type)) {
      this.logger_.info(
        `Authorize.net webhook ${event.notificationId}: ${type} for transaction ${transId}. Medusa does not record refunds and voids made in the Merchant Interface`
      )
      return unsupported
    }
    const action = WEBHOOK_ACTIONS[type]
    if (!action || SYNCHRONOUS_WEBHOOK_EVENTS.has(type)) {
      this.logger_.debug(`AuthorizeNetBase.getWebhookActionAndData output: ${JSON.stringify(unsupported)}`)
      return unsupported
    }

    const sessionId = await this.webhookSessionId(event, verified.options)
    if (!sessionId) {
      this.logger_.debug(
        `Authorize.net webhook ${event.notificationId} (${type}) names no Medusa payment session, ignoring it`
      )
      return unsupported
    }
    if (action === PaymentActions.FAILED) {
      this.logger_.warn(
        `Authorize.net declined held transaction ${transId} for payment session ${sessionId}. Cancel the order that waits for it in Medusa`
      )
    }

    const output = {
      action,
      data: { session_id: sessionId, amount: fromAnetAmount(event.payload?.authAmount) ?? 0 },
    }
    this.logger_.debug(`AuthorizeNetBase.getWebhookActionAndData output: ${JSON.stringify(output)}`)
    return output
  }

  /**
   * The payment session of an event. The transaction's `refId` is the session id: the event carries it
   * as `merchantReferenceId`, and `getTransactionDetails` as `transrefId` when the event does not, as
   * for a capture made in the Merchant Interface or one whose `refId` named a Medusa capture.
   */
  private async webhookSessionId(event: AnetWebhookEvent, options: AuthorizeNetOptions): Promise<string | null> {
    const reference = event.payload?.merchantReferenceId
    if (isSessionId(reference)) {
      return reference
    }
    const transId = event.payload?.id
    if (!transId) {
      return null
    }
    try {
      const response = await this.getClient(options).getTransactionDetails(transId)
      return isSessionId(response.transrefId) ? response.transrefId : null
    } catch (error) {
      this.logger_.warn(
        `Authorize.net webhook ${event.notificationId}: could not read transaction ${transId}: ${(error as Error)?.message ?? String(error)}`
      )
      return null
    }
  }

  /**
   * The event if its signature is valid, otherwise `null`: no Signature Key configured, no
   * `X-ANET-Signature` header, a body that is not the raw request, a wrong signature, or a body that
   * is not an event. The check is local, no call to Authorize.net.
   */
  protected async constructWebhookEvent(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<{ event: AnetWebhookEvent; options: AuthorizeNetOptions } | null> {
    const options = await this.resolveOptions()
    if (!options.signatureKey) {
      this.logger_.warn(
        "Authorize.net webhook received, but no Signature Key is configured, so it cannot be verified and is ignored"
      )
      return null
    }
    const signature = readSignature(payload.headers as Record<string, unknown>)
    const body = readRawBody(payload.rawData)
    if (!signature || !body) {
      this.logger_.warn(`Authorize.net webhook without ${signature ? "a raw body" : "an X-ANET-Signature header"}, ignoring it`)
      return null
    }
    if (!verifyAnetSignature(body, signature, options.signatureKey)) {
      this.logger_.warn("Authorize.net webhook failed the signature check, ignoring it")
      return null
    }
    const event = parseWebhookEvent(body)
    if (!event) {
      this.logger_.warn("Authorize.net webhook passed the signature check but carries no event, ignoring it")
      return null
    }
    return { event, options }
  }

  /** The transaction as Authorize.net reports it now: the only status this provider trusts. */
  protected async details(client: AuthorizeNetClient, transId: string): Promise<AnetTransactionDetails> {
    const response = await client.getTransactionDetails(transId)
    if (!response.transaction?.transactionStatus) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Authorize.net returned no status for transaction ${transId}`
      )
    }
    return response.transaction
  }

  private requireTransId(session: AuthorizeNetSessionData, method: string): string {
    const id = readTransId(session as Record<string, unknown>)
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Authorize.net ${method} needs the transaction id in data.transId`)
    }
    return id
  }

  /** Logs a failure handed back to Medusa, with the gateway's code and the Medusa ids. */
  private fail(method: string, error: unknown, ids: Record<string, string | undefined>): unknown {
    const code =
      error instanceof AuthorizeNetApiError ? error.anetCode : error instanceof MedusaError ? error.code : undefined
    // workflow failures arrive as plain objects, not Error instances
    const message = (error as { message?: string } | undefined)?.message ?? String(error)
    this.logger_.error(
      `AuthorizeNetBase.${method} failed: ${message}${code ? ` code=${code}` : ""} ${JSON.stringify(withoutEmpty(ids))}`
    )
    return error
  }
}

export default AuthorizeNetBase
