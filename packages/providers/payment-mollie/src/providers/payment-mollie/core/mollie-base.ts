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
  BigNumberInput,
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
import type { Client } from "mollie-api-typescript"
import type { PaymentRequest, PaymentResponse } from "mollie-api-typescript/models"
import { callMollie, getMollie, MollieApiError } from "../../../lib/mollie-client"
import { ProviderKeys } from "../../../types"
import { toMollieAddress } from "../../../utils/address"
import { fromMollieAmount, sameMollieAmount, toMollieAmount } from "../../../utils/amounts"
import { toMollieLocale } from "../../../utils/locale"
import {
  MollieCaptureRecord,
  MollieRefundRecord,
  MollieSessionData,
  readPaymentId,
  readRedirectUrl,
  readSessionInput,
  toPaymentData,
} from "../../../utils/payment-data"
import {
  isKnownPaymentStatus,
  LIVE_REFUND_STATUSES,
  sessionStatusFor,
  webhookActionFor,
} from "../../../utils/status-map"
import { readMetadataSessionId, readWebhookPaymentId } from "../../../utils/webhook"
import { getMollieCart, type MollieCart } from "../../../workflows/get-mollie-cart"
import { getPaymentCollectionId } from "../../../workflows/get-payment-collection-id"
import { paymentSessionExists } from "../../../workflows/payment-session-exists"
import type { MollieOptions } from "../types"

/** Mollie cuts a longer description (docs: "Create payment"). */
const MAX_DESCRIPTION_LENGTH = 255

/** What the buyer sees on Mollie's page and on the bank statement when the merchant set nothing. */
function defaultDescription(cart: MollieCart | null, sessionId: string): string {
  return cart?.id ? `Cart ${cart.id}` : `Payment ${sessionId}`
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

function messageOf(error: unknown): string {
  // workflow failures arrive as plain objects, not Error instances
  return (error as { message?: string } | undefined)?.message ?? String(error)
}

abstract class MollieBase extends AbstractPaymentProvider {
  protected logger_: Logger
  protected instanceId_: string | null
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  /**
   * Validate options passed to the provider.
   */
  static validateOptions(_options: Record<string, unknown>): void {
    MollieBase.telemetry_.track("plugin.started")
  }

  constructor(container: { logger: Logger } & Record<string, any>, options?: Record<string, unknown>) {
    super(container, options)
    this.logger_ = container.logger
    this.instanceId_ = (options?.id as string | undefined) ?? null
  }

  /**
   * Resolve the merchant's Mollie settings from the integration module.
   */
  protected async resolveOptions(): Promise<MollieOptions> {
    return resolveIntegrationOptions<MollieOptions>({
      identifier: ProviderKeys.MOLLIE,
      instance_id: this.instanceId_,
    })
  }

  protected getClient(options: MollieOptions): Client {
    return getMollie(options.apiKey)
  }

  protected getPaymentCollectionId(sessionId: string): Promise<string> {
    return getPaymentCollectionId(sessionId)
  }

  protected getMollieCart(collectionId: string): Promise<MollieCart | null> {
    return getMollieCart(collectionId)
  }

  protected paymentSessionExists(sessionId: string): Promise<boolean> {
    return paymentSessionExists(sessionId)
  }

  /**
   * The cart behind a session, for the addresses and the email. A failed read never stops the
   * payment: Mollie's page then asks the buyer for what it needs.
   */
  private async readCart(sessionId: string): Promise<MollieCart | null> {
    try {
      return await this.getMollieCart(await this.getPaymentCollectionId(sessionId))
    } catch (error) {
      this.logger_.warn(
        `MollieBase.initiatePayment: could not read the cart of payment session ${sessionId}, creating the payment without addresses: ${messageOf(error)}`
      )
      return null
    }
  }

  private call<T>(operation: string, ids: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
    return callMollie(this.logger_, operation, ids, run)
  }

  /** The payment as Mollie reports it now: the only status this provider trusts. */
  protected fetchPayment(client: Client, paymentId: string): Promise<PaymentResponse> {
    return this.call("getPayment", { payment_id: paymentId }, () => client.payments.get({ paymentId }))
  }

  /**
   * Creates the Mollie payment the buyer pays on Mollie's page. The method is not set, so Mollie
   * shows every method the merchant enabled on the website profile. The addresses come from the
   * cart, never from the session data the storefront wrote.
   */
  private async createPayment(
    client: Client,
    options: MollieOptions,
    args: {
      amount: BigNumberInput
      currencyCode: string
      sessionId: string
      redirectUrl: string
      locale?: string
      idempotencyKey: string
    }
  ): Promise<PaymentResponse> {
    const cart = await this.readCart(args.sessionId)
    const description = (options.paymentDescription?.trim() || defaultDescription(cart, args.sessionId)).slice(
      0,
      MAX_DESCRIPTION_LENGTH
    )
    const paymentRequest = withoutUndefined({
      description,
      amount: toMollieAmount(args.amount, args.currencyCode),
      redirectUrl: args.redirectUrl,
      webhookUrl: options.webhookUrl,
      locale: toMollieLocale(args.locale),
      billingAddress: toMollieAddress(cart?.billing_address ?? cart?.shipping_address, cart?.email),
      shippingAddress: toMollieAddress(cart?.shipping_address, cart?.email),
      captureMode: options.capture === "manual" ? ("manual" as const) : undefined,
      metadata: withoutUndefined({ session_id: args.sessionId, cart_id: cart?.id }),
    }) as PaymentRequest

    return this.call("createPayment", { session_id: args.sessionId, cart_id: cart?.id }, () =>
      client.payments.create({ idempotencyKey: args.idempotencyKey, paymentRequest })
    )
  }

  /**
   * Medusa calls this when a session is created, which the storefront does once the buyer picked
   * Mollie and the cart has an email and an address. It creates the Mollie payment right away: the
   * storefront needs `checkout_url` to send the buyer to Mollie's page.
   */
  async initiatePayment({ amount, currency_code, data, context }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const input = readSessionInput(data as Record<string, unknown> | undefined)
    const sessionId = input.sessionId ?? (context?.idempotency_key as string | undefined)
    this.logger_.debug(
      `MollieBase.initiatePayment input: ${JSON.stringify({
        amount,
        currency_code,
        session_id: sessionId,
        data_keys: Object.keys(data ?? {}),
        idempotency_key: context?.idempotency_key,
      })}`
    )

    try {
      if (!sessionId) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "Mollie initiatePayment needs data.session_id")
      }
      if (!input.redirectUrl) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Mollie initiatePayment needs data.redirect_url: the absolute http(s) URL the buyer comes back to from Mollie's page"
        )
      }
      if (input.dropped.length) {
        this.logger_.debug(`MollieBase.initiatePayment ignores session data keys: ${input.dropped.join(", ")}`)
      }

      const options = await this.resolveOptions()
      const payment = await this.createPayment(this.getClient(options), options, {
        amount,
        currencyCode: currency_code,
        sessionId,
        redirectUrl: input.redirectUrl,
        locale: input.locale,
        idempotencyKey: (context?.idempotency_key as string | undefined) ?? sessionId,
      })

      // the dropped keys arrived in data and Medusa stores data merged with the output
      const sessionData: MollieSessionData = toPaymentData(
        payment,
        withoutUndefined({ session_id: sessionId, redirect_url: input.redirectUrl, locale: input.locale })
      )
      const output: InitiatePaymentOutput = {
        id: payment.id,
        status: PaymentSessionStatus.PENDING,
        data: { ...Object.fromEntries(input.dropped.map((key) => [key, null])), ...sessionData },
      }
      this.logger_.info(`Mollie payment ${payment.id} created for payment session ${sessionId}`)
      this.logger_.debug(`MollieBase.initiatePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("initiatePayment", error, { session_id: sessionId })
    }
  }

  /**
   * Called by Medusa at the end of `cart.complete`, when the buyer is back from Mollie's page, and
   * by the webhook. It only reads the payment: the buyer paid on Mollie's page already. A payment
   * still `open` or `pending` is reported as such, not thrown, so Medusa keeps the session and the
   * webhook completes the cart once Mollie has the result.
   */
  async authorizePayment({ data }: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const session = (data ?? {}) as MollieSessionData
    this.logger_.debug(`MollieBase.authorizePayment input: ${JSON.stringify({ data: session })}`)
    const paymentId = this.requirePaymentId(session, "authorizePayment")

    try {
      const client = this.getClient(await this.resolveOptions())
      const payment = await this.fetchPayment(client, paymentId)
      const next = toPaymentData(payment, session)

      if (payment.status === "failed") {
        const reason = payment.details?.failureMessage || payment.details?.failureReason
        throw new MedusaError(
          MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          `Mollie payment ${paymentId} failed${reason ? `: ${reason}` : ""}`
        )
      }
      if (!isKnownPaymentStatus(payment.status)) {
        this.logger_.warn(`Mollie payment ${paymentId} has a status this version does not know: ${payment.status}`)
      }

      const status = sessionStatusFor(payment.status)
      if (status === PaymentSessionStatus.AUTHORIZED || status === PaymentSessionStatus.CAPTURED) {
        this.logger_.info(`Mollie payment ${paymentId} is ${payment.status} for payment session ${session.session_id}`)
      }
      const output = { status, data: next as Record<string, unknown> }
      this.logger_.debug(`MollieBase.authorizePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("authorizePayment", error, { session_id: session.session_id, payment_id: paymentId })
    }
  }

  /**
   * Full capture only, as Stripe and PayPal: Medusa does not pass the amount of a capture, and
   * Mollie captures the whole authorization when no amount is given. A paid payment is not
   * captured again.
   */
  async capturePayment({ data, context }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const session = (data ?? {}) as MollieSessionData
    const idempotencyKey = context?.idempotency_key as string | undefined
    this.logger_.debug(
      `MollieBase.capturePayment input: ${JSON.stringify({ data: session, idempotency_key: idempotencyKey })}`
    )
    const paymentId = this.requirePaymentId(session, "capturePayment")

    try {
      const client = this.getClient(await this.resolveOptions())
      const payment = await this.fetchPayment(client, paymentId)
      const current = toPaymentData(payment, session)

      if (payment.status === "paid") {
        return { data: current as Record<string, unknown> }
      }
      if (payment.status !== "authorized") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Mollie payment ${paymentId} is ${payment.status} and cannot be captured`
        )
      }

      const capture = await this.call("createCapture", { payment_id: paymentId, idempotency_key: idempotencyKey }, () =>
        client.captures.create({ paymentId, idempotencyKey: idempotencyKey ?? `${paymentId}-capture` })
      )
      const record: MollieCaptureRecord = withoutUndefined({
        id: capture.id,
        status: capture.status,
        idempotency_key: idempotencyKey,
      })
      this.logger_.info(`Mollie capture ${capture.id} created for payment ${paymentId}`)
      const output = { data: { ...current, captures: [...(session.captures ?? []), record] } as Record<string, unknown> }
      this.logger_.debug(`MollieBase.capturePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("capturePayment", error, { session_id: session.session_id, payment_id: paymentId })
    }
  }

  /**
   * Refunds the amount Medusa asks for, partial and repeated refunds included. The payment's `id`
   * never changes; each refund is added to `refunds`. Mollie pays a refund back asynchronously, from
   * the merchant's balance: `queued` and `pending` are accepted refunds.
   */
  async refundPayment({ data, amount, context }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = (data ?? {}) as MollieSessionData
    const idempotencyKey = context?.idempotency_key as string | undefined
    this.logger_.debug(
      `MollieBase.refundPayment input: ${JSON.stringify({ amount, idempotency_key: idempotencyKey, data: session })}`
    )
    const paymentId = this.requirePaymentId(session, "refundPayment")
    const previous = session.refunds ?? []

    if (idempotencyKey && previous.some((refund) => refund.idempotency_key === idempotencyKey)) {
      return { data: session as Record<string, unknown> }
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      const payment = await this.fetchPayment(client, paymentId)
      const current = toPaymentData(payment, session)
      if (payment.status !== "paid") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Mollie payment ${paymentId} is ${payment.status} and cannot be refunded`
        )
      }

      const refundAmount = toMollieAmount(amount, payment.amount.currency)
      const refund = await this.call("createRefund", { payment_id: paymentId, idempotency_key: idempotencyKey }, () =>
        client.refunds.create({
          paymentId,
          idempotencyKey: idempotencyKey ?? `${paymentId}-refund-${refundAmount.value}`,
          refundRequest: {
            amount: refundAmount,
            metadata: withoutUndefined({ medusa_refund_key: idempotencyKey, session_id: session.session_id }),
          },
        })
      )
      const record: MollieRefundRecord = withoutUndefined({
        id: refund.id,
        status: refund.status,
        amount: MathBN.convert(amount).toNumber(),
        idempotency_key: idempotencyKey,
      })
      if (LIVE_REFUND_STATUSES.has(refund.status)) {
        this.logger_.info(
          `Mollie refund ${refund.id} of ${refundAmount.value} ${refundAmount.currency} for payment ${paymentId} is ${refund.status}`
        )
      } else {
        this.logger_.warn(`Mollie refund ${refund.id} for payment ${paymentId} came back ${refund.status}`)
      }
      const output = { data: { ...current, refunds: [...previous, record] } as Record<string, unknown> }
      this.logger_.debug(`MollieBase.refundPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("refundPayment", error, { session_id: session.session_id, payment_id: paymentId })
    }
  }

  /**
   * Cancels what Mollie still holds. An open payment is canceled; an authorization is released, which
   * Mollie does asynchronously. A paid payment is refunded, not canceled, as with Stripe: a cancel
   * that gave money back would be easy to trigger by mistake. A refusal from Mollie is handed back:
   * swallowing it, as the community plugins did, marks a payment canceled that Mollie still holds.
   */
  async cancelPayment({ data, context }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = (data ?? {}) as MollieSessionData
    this.logger_.debug(`MollieBase.cancelPayment input: ${JSON.stringify({ data: session })}`)
    const paymentId = readPaymentId(session as Record<string, unknown>)
    if (!paymentId) {
      return { data: session as Record<string, unknown> }
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      const payment = await this.fetchPayment(client, paymentId)
      const current = await this.release(client, payment, session, context?.idempotency_key as string | undefined)
      const output = { data: current as Record<string, unknown> }
      this.logger_.debug(`MollieBase.cancelPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("cancelPayment", error, { session_id: session.session_id, payment_id: paymentId })
    }
  }

  /** Cancels an open or cancelable payment, releases an authorization, refuses a paid payment. */
  private async release(
    client: Client,
    payment: PaymentResponse,
    session: MollieSessionData,
    idempotencyKey?: string
  ): Promise<MollieSessionData> {
    const paymentId = payment.id
    const current = toPaymentData(payment, session)
    switch (payment.status) {
      case "canceled":
      case "expired":
      case "failed":
        return current
      case "paid":
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "A paid Mollie payment cannot be canceled. Refund it instead."
        )
      case "authorized":
        await this.call("releaseAuthorization", { payment_id: paymentId }, () =>
          client.payments.releaseAuthorization({
            paymentId,
            idempotencyKey: idempotencyKey ?? `${paymentId}-release`,
          })
        )
        this.logger_.info(`Mollie releases the authorization of payment ${paymentId} for payment session ${session.session_id}`)
        return { ...current, release_requested_at: new Date().toISOString() }
      default: {
        if (payment.status !== "open" && !payment.isCancelable) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            `Mollie payment ${paymentId} is ${payment.status} and cannot be canceled yet`
          )
        }
        let canceled: PaymentResponse
        try {
          canceled = await this.call("cancelPayment", { payment_id: paymentId }, () =>
            client.payments.cancel({ paymentId })
          )
        } catch (error) {
          // Mollie does not cancel an open payment the buyer has picked no method for (422 "The payment
          // cannot be cancelled"), and the provider leaves the method to Mollie's page. The payment
          // expires on its own; if the buyer pays it anyway, the webhook refunds it (settleOrphan).
          if (payment.status === "open" && error instanceof MollieApiError && error.status === 422) {
            this.logger_.warn(
              `Mollie keeps the open payment ${paymentId} of payment session ${session.session_id} until it expires: ${error.detail ?? error.message}. If the buyer pays it, the webhook refunds it`
            )
            return current
          }
          throw error
        }
        this.logger_.info(`Mollie payment ${paymentId} canceled for payment session ${session.session_id}`)
        return toPaymentData(canceled, current)
      }
    }
  }

  /**
   * Medusa deletes every session when the cart's total changes and when the buyer picks another
   * method. The payment behind it is canceled where Mollie allows it, so a stale checkout link cannot
   * be paid; an open one Mollie keeps until it expires. Deleting a session never fails because of
   * Mollie: Medusa calls this without a catch.
   */
  async deletePayment({ data }: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const session = (data ?? {}) as MollieSessionData
    this.logger_.debug(`MollieBase.deletePayment input: ${JSON.stringify({ data: session })}`)
    const paymentId = readPaymentId(session as Record<string, unknown>)
    if (!paymentId) {
      return { data: session as Record<string, unknown> }
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      const payment = await this.fetchPayment(client, paymentId)
      const current =
        payment.status === "open" || payment.status === "authorized"
          ? await this.release(client, payment, session)
          : toPaymentData(payment, session)
      const output = { data: current as Record<string, unknown> }
      this.logger_.debug(`MollieBase.deletePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      this.logger_.warn(`MollieBase.deletePayment could not cancel Mollie payment ${paymentId}: ${messageOf(error)}`)
      return { data: session as Record<string, unknown> }
    }
  }

  /**
   * Mollie does not change the amount of a payment it created. When the amount or the currency
   * changed, the open payment is canceled and a new one is created; otherwise the data stays.
   * Medusa normally replaces the session instead of calling this.
   */
  async updatePayment({ amount, currency_code, data, context }: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const session = (data ?? {}) as MollieSessionData
    this.logger_.debug(
      `MollieBase.updatePayment input: ${JSON.stringify({ amount, currency_code, data: session })}`
    )
    const paymentId = readPaymentId(session as Record<string, unknown>)
    const unchanged =
      !paymentId ||
      amount === undefined ||
      !currency_code ||
      (session.currency_code === currency_code.toLowerCase() &&
        session.amount !== undefined &&
        sameMollieAmount(session.amount, amount, currency_code))
    if (unchanged) {
      return { data: session as Record<string, unknown> }
    }

    const sessionId = session.session_id ?? (context?.idempotency_key as string | undefined)
    try {
      const redirectUrl = readRedirectUrl(session.redirect_url)
      if (!sessionId || !redirectUrl) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Mollie updatePayment needs data.session_id and data.redirect_url to create the new payment"
        )
      }
      const options = await this.resolveOptions()
      const client = this.getClient(options)
      await this.deletePayment({ data: session as Record<string, unknown> })

      const formatted = toMollieAmount(amount, currency_code)
      const payment = await this.createPayment(client, options, {
        amount,
        currencyCode: currency_code,
        sessionId,
        redirectUrl,
        locale: session.locale,
        idempotencyKey: `${sessionId}:${formatted.value}:${formatted.currency}`,
      })
      // a new payment starts with no captures and no refunds: written as null, since Medusa merges data
      const next = toPaymentData(payment, { ...session, captures: null, refunds: null, release_requested_at: null })
      this.logger_.info(`Mollie payment ${payment.id} replaces ${paymentId} for payment session ${sessionId}`)
      const output = { status: PaymentSessionStatus.PENDING, data: next as Record<string, unknown> }
      this.logger_.debug(`MollieBase.updatePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("updatePayment", error, { session_id: sessionId, payment_id: paymentId })
    }
  }

  async getPaymentStatus({ data }: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const session = (data ?? {}) as MollieSessionData
    this.logger_.debug(`MollieBase.getPaymentStatus input: ${JSON.stringify({ data: session })}`)
    const paymentId = readPaymentId(session as Record<string, unknown>)
    if (!paymentId) {
      return { status: PaymentSessionStatus.PENDING, data: session as Record<string, unknown> }
    }
    try {
      const payment = await this.fetchPayment(this.getClient(await this.resolveOptions()), paymentId)
      const output = { status: sessionStatusFor(payment.status), data: toPaymentData(payment, session) as Record<string, unknown> }
      this.logger_.debug(`MollieBase.getPaymentStatus output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("getPaymentStatus", error, { session_id: session.session_id, payment_id: paymentId })
    }
  }

  async retrievePayment({ data }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const session = (data ?? {}) as MollieSessionData
    this.logger_.debug(`MollieBase.retrievePayment input: ${JSON.stringify({ data: session })}`)
    const paymentId = this.requirePaymentId(session, "retrievePayment")
    try {
      const payment = await this.fetchPayment(this.getClient(await this.resolveOptions()), paymentId)
      const output = { data: toPaymentData(payment, session) as Record<string, unknown> }
      this.logger_.debug(`MollieBase.retrievePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("retrievePayment", error, { session_id: session.session_id, payment_id: paymentId })
    }
  }

  /**
   * A classic Mollie webhook carries only `id=tr_…` and no signature. The payment is read back from
   * Mollie with the merchant's key, so a forged call can only make the provider read the true status
   * of a real payment. `paid` completes the cart even when the buyer never came back to the shop;
   * Medusa ignores a repeated event, the cart is completed and the payment captured once.
   */
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const unsupported = { action: PaymentActions.NOT_SUPPORTED }
    const paymentId = readWebhookPaymentId(payload)
    this.logger_.debug(`MollieBase.getWebhookActionAndData input: ${JSON.stringify({ payment_id: paymentId })}`)
    if (!paymentId) {
      this.logger_.debug("Mollie webhook without a payment id, ignoring it")
      return unsupported
    }

    const client = this.getClient(await this.resolveOptions())
    let payment: PaymentResponse
    try {
      payment = await this.fetchPayment(client, paymentId)
    } catch (error) {
      if (error instanceof MollieApiError && (error.status === 404 || error.status === 410)) {
        this.logger_.debug(`Mollie webhook for payment ${paymentId}, which this account does not have, ignoring it`)
        return unsupported
      }
      // thrown, so Medusa's event bus retries the event
      throw this.fail("getWebhookActionAndData", error, { payment_id: paymentId })
    }

    const sessionId = readMetadataSessionId(payment.metadata)
    if (!sessionId) {
      this.logger_.debug(`Mollie webhook for payment ${paymentId}, which names no Medusa payment session, ignoring it`)
      return unsupported
    }
    await this.reportFailedRefunds(client, payment, sessionId)

    const action = webhookActionFor(payment.status)
    if (action === PaymentActions.NOT_SUPPORTED) {
      this.logger_.debug(`MollieBase.getWebhookActionAndData output: ${JSON.stringify(unsupported)}`)
      return unsupported
    }
    if (!(await this.paymentSessionExists(sessionId))) {
      await this.settleOrphan(client, payment, sessionId)
      return unsupported
    }
    const output = {
      action,
      data: { session_id: sessionId, amount: fromMollieAmount(payment.amount) ?? 0 },
    }
    this.logger_.info(`Mollie webhook: payment ${paymentId} is ${payment.status} for payment session ${sessionId}`)
    this.logger_.debug(`MollieBase.getWebhookActionAndData output: ${JSON.stringify(output)}`)
    return output
  }

  /**
   * Gives the money back for a payment whose Medusa session is gone. Mollie does not cancel an open
   * payment the buyer has not picked a method for (422 "The payment cannot be cancelled"), so a
   * replaced session can leave a payable checkout page behind: the buyer goes back from Mollie's page
   * and pays again, then pays the old page too. No order can be placed for a session that no longer
   * exists, so a paid payment is refunded in full of what is left, and a held one is released. The
   * keys are the payment's own, so a repeated webhook does not refund twice.
   */
  private async settleOrphan(client: Client, payment: PaymentResponse, sessionId: string): Promise<void> {
    const paymentId = payment.id
    try {
      if (payment.status === "authorized") {
        await this.call("releaseAuthorization", { payment_id: paymentId, session_id: sessionId }, () =>
          client.payments.releaseAuthorization({ paymentId, idempotencyKey: `${paymentId}-orphan-release` })
        )
        this.logger_.warn(
          `Mollie payment ${paymentId} was authorized for payment session ${sessionId}, which no longer exists in Medusa, so no order was placed. Mollie releases the held amount`
        )
        return
      }

      const remaining =
        fromMollieAmount(payment.amountRemaining) ??
        (fromMollieAmount(payment.amount) ?? 0) - (fromMollieAmount(payment.amountRefunded) ?? 0)
      if (remaining <= 0) {
        this.logger_.debug(`Mollie payment ${paymentId} of the removed payment session ${sessionId} is refunded already`)
        return
      }
      const amount = toMollieAmount(remaining, payment.amount.currency)
      const refund = await this.call("createRefund", { payment_id: paymentId, session_id: sessionId }, () =>
        client.refunds.create({
          paymentId,
          idempotencyKey: `${paymentId}-orphan-refund`,
          refundRequest: { amount, metadata: { reason: "payment_session_removed", session_id: sessionId } },
        })
      )
      this.logger_.warn(
        `Mollie payment ${paymentId} was paid for payment session ${sessionId}, which no longer exists in Medusa, so no order was placed. Refunded ${amount.value} ${amount.currency} (refund ${refund.id}, ${refund.status})`
      )
    } catch (error) {
      // thrown, so Medusa's event bus retries the event and the money is not left behind
      throw this.fail("getWebhookActionAndData", error, { session_id: sessionId, payment_id: paymentId })
    }
  }

  /**
   * Mollie calls the payment's webhook when one of its refunds changes status. A refund that failed
   * after Medusa recorded it is not undone in Medusa; it is logged for the merchant to act on.
   */
  private async reportFailedRefunds(client: Client, payment: PaymentResponse, sessionId: string): Promise<void> {
    if (!fromMollieAmount(payment.amountRefunded)) {
      return
    }
    try {
      const page = await this.call("listRefunds", { payment_id: payment.id }, () =>
        client.refunds.list({ paymentId: payment.id, limit: 250 })
      )
      for (const refund of page.result.embedded.refunds) {
        if (refund.status === "failed") {
          this.logger_.warn(
            `Mollie refund ${refund.id} of ${refund.amount.value} ${refund.amount.currency} for payment ${payment.id} (payment session ${sessionId}) failed. Medusa still records it as refunded`
          )
        }
      }
    } catch (error) {
      this.logger_.debug(`Mollie webhook could not read the refunds of payment ${payment.id}: ${messageOf(error)}`)
    }
  }

  private requirePaymentId(session: MollieSessionData, method: string): string {
    const id = readPaymentId(session as Record<string, unknown>)
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Mollie ${method} needs the Mollie payment id in data.id`)
    }
    return id
  }

  /** Logs a failure handed back to Medusa, with Mollie's status and the Medusa ids. */
  private fail(method: string, error: unknown, ids: Record<string, string | undefined>): unknown {
    const code = error instanceof MedusaError ? error.code : undefined
    this.logger_.error(
      `MollieBase.${method} failed: ${messageOf(error)}${code ? ` code=${code}` : ""} ${JSON.stringify(withoutUndefined(ids))}`
    )
    return error
  }
}

export default MollieBase
