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
import { PayPalApiError, PayPalClient } from "../../../lib/paypal-client"
import type { Order, OrderRequest } from "../../../lib/paypal-orders-client"
import { ProviderKeys } from "../../../types"
import { formatAmount } from "../../../utils/amounts"
import { assertPayPalCurrency } from "../../../utils/currencies"
import { getPayPalDecline } from "../../../utils/decline"
import { mapAuthorizationStatus, mapCaptureStatus, resolveOrderStatus } from "../../../utils/status-map"
import { isPayPalCertUrl, readTransmission, readWebhookBody, WEBHOOK_ACTIONS } from "../../../utils/webhook"
import { getPaymentCollectionId } from "../../../workflows/get-payment-collection-id"
import { MedusaAddress, PayPalOptions, PayPalRefundRecord, PayPalSessionData } from "../types"

/**
 * Order statuses in which the amount can still change. An order created with an experience context
 * may come back as PAYER_ACTION_REQUIRED instead of CREATED while the buyer is in the PayPal window.
 */
const PATCHABLE_ORDER_STATUSES = new Set(["CREATED", "PAYER_ACTION_REQUIRED", "APPROVED"])
/** Refund statuses that mean the money did not go back. PENDING settles later. */
const FAILED_REFUND_STATUSES = new Set(["FAILED", "CANCELLED", "CANCELED", "DENIED"])

type OrderPayments = {
  captureId?: string
  captureStatus?: string
  authorizationId?: string
  authorizationStatus?: string
}

function orderPayments(order: Order): OrderPayments {
  const payments = order.purchase_units?.[0]?.payments
  const capture = payments?.captures?.[0]
  const authorization = payments?.authorizations?.[0]
  return {
    captureId: capture?.id,
    captureStatus: capture?.status,
    authorizationId: authorization?.id,
    authorizationStatus: authorization?.status,
  }
}

function withoutEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== "")) as T
}

function toPayPalAddress(address: MedusaAddress) {
  return withoutEmpty({
    address_line_1: address.address_1 ?? undefined,
    address_line_2: address.address_2 ?? undefined,
    admin_area_2: address.city ?? undefined,
    admin_area_1: address.province ?? undefined,
    postal_code: address.postal_code ?? undefined,
    country_code: String(address.country_code).toUpperCase(),
  })
}

function toPayPalShipping(address: MedusaAddress) {
  const fullName = [address.first_name, address.last_name].filter(Boolean).join(" ")
  return withoutEmpty({
    name: fullName ? { full_name: fullName } : undefined,
    address: toPayPalAddress(address),
  })
}

/**
 * The buyer's email, name and billing address, which PayPal fills in on its card form. A billing
 * address without a name or a street takes them from the delivery address.
 */
function toPayPalPayer(input: PayPalSessionData) {
  const billing = input.billing_address
  const shipping = input.shipping_address
  const person = billing?.first_name || billing?.last_name ? billing : shipping
  const address = billing?.address_1 ? billing : shipping
  const name = withoutEmpty({
    given_name: person?.first_name ?? undefined,
    surname: person?.last_name ?? undefined,
  })
  return withoutEmpty({
    email_address: input.email ?? undefined,
    name: Object.keys(name).length ? name : undefined,
    address: address?.country_code ? toPayPalAddress(address) : undefined,
  })
}

abstract class PayPalBase extends AbstractPaymentProvider {
  protected logger_: Logger
  protected instanceId_: string | null
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  /**
   * Validate options passed to the provider.
   */
  static validateOptions(_options: Record<string, unknown>): void {
    PayPalBase.telemetry_.track("plugin.started")
  }

  constructor(container: { logger: Logger } & Record<string, any>, options?: Record<string, unknown>) {
    super(container, options)
    this.logger_ = container.logger
    this.instanceId_ = (options?.id as string | undefined) ?? null
  }

  /**
   * Resolve the merchant's PayPal settings from the integration module.
   */
  protected async resolveOptions(): Promise<PayPalOptions> {
    return resolveIntegrationOptions<PayPalOptions>({
      identifier: ProviderKeys.PAYPAL,
      instance_id: this.instanceId_,
    })
  }

  protected getClient(options: PayPalOptions): PayPalClient {
    return new PayPalClient({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      environment: options.environment,
      logger: this.logger_,
    })
  }

  protected getPaymentCollectionId(sessionId: string): Promise<string> {
    return getPaymentCollectionId(sessionId)
  }

  /**
   * Create the PayPal order for a session, or reuse the order the storefront
   * passes as `paypal_order_id`. Medusa deletes every session when the cart total
   * changes, which in an express checkout happens while the PayPal window is open,
   * so the new session takes over the order with a PATCH instead of a new order.
   */
  async initiatePayment({ amount, currency_code, data, context }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const input = (data ?? {}) as PayPalSessionData
    this.logger_.debug(
      `PayPalBase.initiatePayment input: ${JSON.stringify({ amount, currency_code, data: input, idempotency_key: context?.idempotency_key })}`
    )

    const sessionId = input.session_id
    if (!sessionId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "PayPal initiatePayment needs data.session_id")
    }

    try {
      const currency = assertPayPalCurrency(currency_code)
      const value = formatAmount(amount, currency)
      const options = await this.resolveOptions()
      const client = this.getClient(options)
      const collectionId = await this.getPaymentCollectionId(sessionId)

      let order: Order
      if (input.paypal_order_id) {
        order = await client.getOrder(input.paypal_order_id)
        this.assertReusable(order, collectionId, currency)
        this.assertNotRaisedAfterApproval(order, value)
        await client.patchOrder(order.id!, [
          {
            op: "replace",
            path: `/purchase_units/@reference_id=='${collectionId}'/amount`,
            value: { currency_code: currency, value },
          },
          {
            op: "replace",
            path: `/purchase_units/@reference_id=='${collectionId}'/custom_id`,
            value: sessionId,
          },
        ])
      } else {
        order = await client.createOrder(
          this.buildOrderRequest(options, input, { collectionId, sessionId, currency, value }),
          context?.idempotency_key ?? sessionId
        )
      }

      const output: InitiatePaymentOutput = {
        id: order.id!,
        data: withoutEmpty({
          session_id: sessionId,
          paypal_order_id: order.id,
          intent: order.intent,
          currency_code: currency,
          status: order.status,
          express: input.express,
        }),
      }
      this.logger_.debug(`PayPalBase.initiatePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("initiatePayment", error, { session_id: sessionId, paypal_order_id: input.paypal_order_id })
    }
  }

  /**
   * Called by Medusa when the cart completes. A buyer's approval moves no money,
   * so an APPROVED order is captured (intent CAPTURE) or authorized (intent
   * AUTHORIZE) here.
   */
  async authorizePayment({ data, context }: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const session = (data ?? {}) as PayPalSessionData
    this.logger_.debug(`PayPalBase.authorizePayment input: ${JSON.stringify({ data: session })}`)
    const orderId = this.requireOrderId(session, "authorizePayment")
    const requestKey = context?.idempotency_key ?? session.session_id ?? orderId

    try {
      const client = this.getClient(await this.resolveOptions())
      const order = await client.getOrder(orderId)
      let output: AuthorizePaymentOutput

      if (order.status === "APPROVED" && order.intent === "AUTHORIZE") {
        const authorized = await client.authorizeOrder(orderId, `${requestKey}-authorize`)
        const payments = orderPayments(authorized as Order)
        output = {
          status: mapAuthorizationStatus(payments.authorizationStatus) ?? PaymentSessionStatus.ERROR,
          data: this.mergeOrder(session, authorized as Order),
        }
      } else if (order.status === "APPROVED") {
        output = await this.captureApprovedOrder(client, session, orderId, `${requestKey}-capture`)
      } else if (order.status === "COMPLETED") {
        output = { status: resolveOrderStatus(order), data: this.mergeOrder(session, order) }
      } else if (order.status === "VOIDED") {
        output = { status: PaymentSessionStatus.CANCELED, data: this.mergeOrder(session, order) }
      } else {
        // CREATED, SAVED, PAYER_ACTION_REQUIRED: the buyer has not approved yet
        output = { status: PaymentSessionStatus.REQUIRES_MORE, data: this.mergeOrder(session, order) }
      }

      this.logger_.debug(`PayPalBase.authorizePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("authorizePayment", error, { session_id: session.session_id, paypal_order_id: orderId })
    }
  }

  /**
   * Full capture only, as the official Stripe provider does: the whole
   * authorization is captured with `final_capture`.
   */
  async capturePayment({ data, context }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const session = (data ?? {}) as PayPalSessionData
    this.logger_.debug(
      `PayPalBase.capturePayment input: ${JSON.stringify({ data: session, idempotency_key: context?.idempotency_key })}`
    )

    // captured when the cart completed, pending, or recorded from a webhook
    if (session.capture_id) {
      const output = { data: session }
      this.logger_.debug(`PayPalBase.capturePayment output: ${JSON.stringify(output)}`)
      return output
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      let authorizationId = session.authorization_id
      if (!authorizationId) {
        const order = await client.getOrder(this.requireOrderId(session, "capturePayment"))
        const payments = orderPayments(order)
        if (payments.captureId) {
          return { data: this.mergeOrder(session, order) }
        }
        authorizationId = payments.authorizationId
      }
      if (!authorizationId) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "The PayPal order has no authorization to capture")
      }

      let output: CapturePaymentOutput
      try {
        const capture = await client.captureAuthorization(
          authorizationId,
          { final_capture: true },
          context?.idempotency_key ?? `${authorizationId}-capture`
        )
        if (capture.status === "DECLINED" || capture.status === "FAILED") {
          const decline = getPayPalDecline(capture)
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            `PayPal declined the capture: ${decline?.message ?? capture.status}`,
            decline?.code
          )
        }
        output = { data: { ...session, capture_id: capture.id, capture_status: capture.status } }
      } catch (error) {
        // A repeated capture of a captured authorization fails with 422. The spec does
        // not name that error, so the order decides whether the capture already exists.
        if (!(error instanceof PayPalApiError) || error.status !== 422 || !session.paypal_order_id) {
          throw error
        }
        const order = await client.getOrder(session.paypal_order_id)
        const payments = orderPayments(order)
        if (payments.authorizationStatus !== "CAPTURED" || payments.captureStatus !== "COMPLETED") {
          throw error
        }
        output = { data: this.mergeOrder(session, order) }
      }

      this.logger_.debug(`PayPalBase.capturePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("capturePayment", error, { session_id: session.session_id, paypal_order_id: session.paypal_order_id })
    }
  }

  /**
   * Refund with the amount Medusa asks for. An empty body would refund the whole
   * capture, so a refund without an amount is refused.
   */
  async refundPayment({ amount, data, context }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = (data ?? {}) as PayPalSessionData
    this.logger_.debug(
      `PayPalBase.refundPayment input: ${JSON.stringify({ amount, data: session, idempotency_key: context?.idempotency_key })}`
    )

    try {
      if (!session.capture_id) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "The PayPal payment has no capture to refund")
      }
      if (!session.currency_code) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "The PayPal payment has no currency")
      }
      const value = formatAmount(amount, session.currency_code)
      if (Number(value) <= 0) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "A PayPal refund needs a positive amount")
      }

      const client = this.getClient(await this.resolveOptions())
      const refund = await client.refundCapture(
        session.capture_id,
        { amount: { currency_code: session.currency_code, value } },
        context?.idempotency_key ?? `${session.capture_id}-refund-${value}`
      )
      if (FAILED_REFUND_STATUSES.has(String(refund.status))) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `PayPal refund ${refund.id} ended as ${refund.status}`,
          refund.status
        )
      }

      const record: PayPalRefundRecord = { id: refund.id, status: refund.status, amount: value }
      const output = { data: { ...session, refunds: [...(session.refunds ?? []), record] } }
      this.logger_.debug(`PayPalBase.refundPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("refundPayment", error, { session_id: session.session_id, capture_id: session.capture_id })
    }
  }

  /**
   * Voids an authorization. A captured payment is refunded, not canceled: Medusa
   * cancels only payments without captures, and a full refund here would be easy
   * to trigger by mistake.
   */
  async cancelPayment({ data, context }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = (data ?? {}) as PayPalSessionData
    this.logger_.debug(`PayPalBase.cancelPayment input: ${JSON.stringify({ data: session })}`)

    if (session.capture_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "A captured PayPal payment cannot be canceled. Refund it instead."
      )
    }
    if (!session.authorization_id) {
      // nothing was authorized; an unapproved PayPal order expires on its own
      const output = { data: session }
      this.logger_.debug(`PayPalBase.cancelPayment output: ${JSON.stringify(output)}`)
      return output
    }

    try {
      const client = this.getClient(await this.resolveOptions())
      let status: string | undefined
      try {
        const voided = await client.voidAuthorization(
          session.authorization_id,
          context?.idempotency_key ?? `${session.authorization_id}-void`
        )
        status = voided?.status ?? "VOIDED"
      } catch (error) {
        if (!(error instanceof PayPalApiError) || error.status !== 422 || !session.paypal_order_id) {
          throw error
        }
        const payments = orderPayments(await client.getOrder(session.paypal_order_id))
        if (payments.authorizationStatus !== "VOIDED") {
          throw error
        }
        status = payments.authorizationStatus
      }

      const output = { data: { ...session, authorization_status: status } }
      this.logger_.debug(`PayPalBase.cancelPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("cancelPayment", error, { session_id: session.session_id, authorization_id: session.authorization_id })
    }
  }

  /**
   * Leaves the PayPal order alone. Medusa deletes a session whenever the cart
   * total changes, and the next session reuses the same order.
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    this.logger_.debug(`PayPalBase.deletePayment input: ${JSON.stringify(input)}`)
    const output = { data: input.data }
    this.logger_.debug(`PayPalBase.deletePayment output: ${JSON.stringify(output)}`)
    return output
  }

  /**
   * Medusa 2.21 never calls this; it changes the order amount the way
   * `initiatePayment` does when an order is reused, in case a later Medusa does.
   */
  async updatePayment({ amount, currency_code, data }: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const session = (data ?? {}) as PayPalSessionData
    this.logger_.debug(`PayPalBase.updatePayment input: ${JSON.stringify({ amount, currency_code, data: session })}`)
    if (!session.paypal_order_id) {
      return { data: session }
    }

    try {
      const currency = assertPayPalCurrency(currency_code)
      const value = formatAmount(amount, currency)
      const client = this.getClient(await this.resolveOptions())
      const order = await client.getOrder(session.paypal_order_id)
      if (!PATCHABLE_ORDER_STATUSES.has(String(order.status))) {
        const output = { data: session }
        this.logger_.debug(`PayPalBase.updatePayment output: ${JSON.stringify(output)}`)
        return output
      }
      this.assertNotRaisedAfterApproval(order, value)
      const referenceId = order.purchase_units?.[0]?.reference_id ?? "default"
      await client.patchOrder(session.paypal_order_id, [
        {
          op: "replace",
          path: `/purchase_units/@reference_id=='${referenceId}'/amount`,
          value: { currency_code: currency, value },
        },
      ])

      const output = { data: { ...session, amount: value, currency_code: currency } }
      this.logger_.debug(`PayPalBase.updatePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("updatePayment", error, { session_id: session.session_id, paypal_order_id: session.paypal_order_id })
    }
  }

  async getPaymentStatus({ data }: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const session = (data ?? {}) as PayPalSessionData
    this.logger_.debug(`PayPalBase.getPaymentStatus input: ${JSON.stringify({ data: session })}`)
    if (!session.paypal_order_id) {
      return { status: PaymentSessionStatus.PENDING, data: session }
    }

    try {
      const order = await this.getClient(await this.resolveOptions()).getOrder(session.paypal_order_id)
      const output = { status: resolveOrderStatus(order), data: this.mergeOrder(session, order) }
      this.logger_.debug(`PayPalBase.getPaymentStatus output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("getPaymentStatus", error, { session_id: session.session_id, paypal_order_id: session.paypal_order_id })
    }
  }

  async retrievePayment({ data }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const session = (data ?? {}) as PayPalSessionData
    this.logger_.debug(`PayPalBase.retrievePayment input: ${JSON.stringify({ data: session })}`)
    const orderId = this.requireOrderId(session, "retrievePayment")

    try {
      const order = await this.getClient(await this.resolveOptions()).getOrder(orderId)
      const output = { data: this.mergeOrder(session, order) }
      this.logger_.debug(`PayPalBase.retrievePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("retrievePayment", error, { session_id: session.session_id, paypal_order_id: orderId })
    }
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const body = readWebhookBody(payload.rawData)
    const event = body?.event
    this.logger_.debug(
      `PayPalBase.getWebhookActionAndData input: ${JSON.stringify({ id: event?.id, event_type: event?.event_type, resource_id: event?.resource?.id })}`
    )
    const unsupported = { action: PaymentActions.NOT_SUPPORTED }

    try {
      if (!event || !(await this.isWebhookEventValid(payload))) {
        this.logger_.debug(`PayPalBase.getWebhookActionAndData output: ${JSON.stringify(unsupported)}`)
        return unsupported
      }
      const action = (event.event_type && WEBHOOK_ACTIONS[event.event_type]) || PaymentActions.NOT_SUPPORTED
      const resource = event.resource ?? {}
      if (action === PaymentActions.NOT_SUPPORTED) {
        this.logger_.debug(`PayPalBase.getWebhookActionAndData output: ${JSON.stringify(unsupported)}`)
        return unsupported
      }

      let sessionId = resource.custom_id
      const orderId = resource.supplementary_data?.related_ids?.order_id
      if (!sessionId && orderId && (action === PaymentActions.AUTHORIZED || action === PaymentActions.SUCCESSFUL)) {
        const order = await this.getClient(await this.resolveOptions()).getOrder(orderId)
        sessionId = order.purchase_units?.[0]?.custom_id
      }
      if (!sessionId) {
        this.logger_.warn(`PayPal webhook ${event.id} (${event.event_type}) names no Medusa payment session, ignoring it`)
        return unsupported
      }
      if (action === PaymentActions.CANCELED) {
        this.logger_.info(
          `PayPal webhook ${event.id}: ${event.event_type} for ${resource.id}. Medusa does not record refunds and voids made in PayPal`
        )
      }

      const output = { action, data: { session_id: sessionId, amount: resource.amount?.value ?? 0 } }
      this.logger_.debug(`PayPalBase.getWebhookActionAndData output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("getWebhookActionAndData", error, { event_id: event?.id, resource_id: event?.resource?.id })
    }
  }

  /**
   * Asks PayPal whether the delivery is genuine. False for anything that cannot be checked: no webhook
   * ID configured, a missing signature header, a certificate outside PayPal's hosts, or a body that
   * is not JSON. A failed call to PayPal throws, so the event bus retries the event.
   */
  protected async isWebhookEventValid(payload: ProviderWebhookPayload["payload"]): Promise<boolean> {
    const options = await this.resolveOptions()
    if (!options.webhookId) {
      this.logger_.warn("PayPal webhook received, but no webhook ID is configured, so it cannot be verified and is ignored")
      return false
    }
    const transmission = readTransmission(payload.headers)
    if (!transmission) {
      this.logger_.warn("PayPal webhook is missing a signature header, ignoring it")
      return false
    }
    if (!isPayPalCertUrl(transmission.cert_url)) {
      this.logger_.warn(`PayPal webhook names a certificate outside PayPal: ${transmission.cert_url}, ignoring it`)
      return false
    }
    const body = readWebhookBody(payload.rawData)
    if (!body) {
      return false
    }

    const result = await this.getClient(options).verifyWebhookSignature(
      { ...transmission, webhook_id: options.webhookId },
      body.raw
    )
    if (result.verification_status !== "SUCCESS") {
      this.logger_.warn(
        `PayPal webhook ${transmission.transmission_id} failed the signature check: ${result.verification_status}`
      )
      return false
    }
    return true
  }

  protected buildOrderRequest(
    options: PayPalOptions,
    input: PayPalSessionData,
    order: { collectionId: string; sessionId: string; currency: string; value: string }
  ): OrderRequest {
    const shipping = input.shipping_address?.country_code ? toPayPalShipping(input.shipping_address) : undefined
    const shippingPreference = input.express ? "GET_FROM_FILE" : shipping ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING"

    return {
      intent: options.intent === "authorize" ? "AUTHORIZE" : "CAPTURE",
      purchase_units: [
        withoutEmpty({
          reference_id: order.collectionId,
          custom_id: order.sessionId,
          amount: { currency_code: order.currency, value: order.value },
          soft_descriptor: options.softDescriptor,
          shipping: input.express ? undefined : shipping,
        }),
      ],
      payment_source: {
        paypal: {
          // In an express checkout the buyer picks these details in the PayPal window.
          ...(input.express ? {} : toPayPalPayer(input)),
          experience_context: withoutEmpty({
            brand_name: options.brandName,
            landing_page: options.landingPage ?? "NO_PREFERENCE",
            shipping_preference: shippingPreference,
            user_action: input.express ? "CONTINUE" : "PAY_NOW",
          }),
        },
      },
    } as OrderRequest
  }

  /**
   * The buyer approved the order's current amount. A higher one would be captured without their
   * consent, so an approved order only takes the same or a lower amount, and the buyer pays a higher
   * total again.
   */
  private assertNotRaisedAfterApproval(order: Order, value: string) {
    const approved = order.purchase_units?.[0]?.amount
    if (order.status === "APPROVED" && approved?.value !== undefined && MathBN.gt(value, approved.value)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayPal order ${order.id} was approved for ${approved.value} ${approved.currency_code}, and the new total ${value} is higher. The buyer has to pay again.`
      )
    }
  }

  private assertReusable(order: Order, collectionId: string, currency: string) {
    if (!PATCHABLE_ORDER_STATUSES.has(String(order.status))) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayPal order ${order.id} is ${order.status} and cannot be reused`
      )
    }
    const unit = order.purchase_units?.[0]
    if (unit?.reference_id !== collectionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayPal order ${order.id} belongs to another payment collection`
      )
    }
    if (unit.amount?.currency_code && unit.amount.currency_code !== currency) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayPal order ${order.id} is in ${unit.amount.currency_code}, not ${currency}`
      )
    }
  }

  private async captureApprovedOrder(
    client: PayPalClient,
    session: PayPalSessionData,
    orderId: string,
    requestId: string
  ): Promise<AuthorizePaymentOutput> {
    let captured: Order
    try {
      captured = await client.captureOrder(orderId, requestId)
    } catch (error) {
      const decline = error instanceof PayPalApiError ? getPayPalDecline(error.data) : null
      if (!decline) {
        throw error
      }
      this.logger_.warn(`PayPalBase.authorizePayment declined: ${decline.code} paypal_order=${orderId}`)
      return { status: PaymentSessionStatus.ERROR, data: { ...session, decline } }
    }

    const payments = orderPayments(captured)
    const status = mapCaptureStatus(payments.captureStatus) ?? PaymentSessionStatus.ERROR
    const decline = status === PaymentSessionStatus.ERROR ? getPayPalDecline(captured) : null
    return {
      status,
      data: withoutEmpty({ ...this.mergeOrder(session, captured), decline: decline ?? undefined }),
    }
  }

  private mergeOrder(session: PayPalSessionData, order: Order): PayPalSessionData {
    const payments = orderPayments(order)
    return withoutEmpty({
      ...session,
      status: order.status ?? session.status,
      capture_id: payments.captureId ?? session.capture_id,
      capture_status: payments.captureStatus ?? session.capture_status,
      authorization_id: payments.authorizationId ?? session.authorization_id,
      authorization_status: payments.authorizationStatus ?? session.authorization_status,
    })
  }

  private requireOrderId(session: PayPalSessionData, method: string): string {
    if (!session.paypal_order_id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `PayPal ${method} needs data.paypal_order_id`)
    }
    return session.paypal_order_id
  }

  /** Logs a failure handed back to Medusa, with PayPal's error code and the Medusa ids. */
  private fail(method: string, error: unknown, ids: Record<string, string | undefined>): unknown {
    const code = error instanceof MedusaError ? error.code : undefined
    // workflow failures arrive as plain objects, not Error instances
    const message = (error as { message?: string } | undefined)?.message ?? String(error)
    this.logger_.error(
      `PayPalBase.${method} failed: ${message}${code ? ` code=${code}` : ""} ${JSON.stringify(withoutEmpty(ids))}`
    )
    return error
  }
}

export default PayPalBase
