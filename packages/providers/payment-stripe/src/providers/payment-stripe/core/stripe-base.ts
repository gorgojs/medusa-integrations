import type Stripe from "stripe"
import {
  AbstractPaymentProvider,
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
  CreateAccountHolderInput,
  CreateAccountHolderOutput,
  DeleteAccountHolderInput,
  DeleteAccountHolderOutput,
  DeletePaymentInput,
  DeletePaymentMethodInput,
  DeletePaymentMethodOutput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ListPaymentMethodsInput,
  ListPaymentMethodsOutput,
  Logger,
  PaymentCustomerDTO,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  SavePaymentMethodInput,
  SavePaymentMethodOutput,
  UpdateAccountHolderInput,
  UpdateAccountHolderOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { createTelemetryClient } from "@gorgo/telemetry"
import { resolveIntegrationOptions } from "@gorgo/medusa-integration"
import { callStripe, getStripe, StripeApiError } from "../../../lib/stripe-client"
import { ProviderKeys } from "../../../types"
import { fromStripeAmount, toStripeAmount } from "../../../utils/amounts"
import { normalizeSessionData, readIntentId, scrubbed, toSessionData } from "../../../utils/payment-data"
import { mapIntentStatus, UNCONFIRMED_INTENT_STATUSES } from "../../../utils/status-map"
import {
  MEDUSA_REFUND_METADATA_KEY,
  readRawBody,
  readSignature,
  UNRECORDED_WEBHOOK_EVENTS,
  WEBHOOK_ACTIONS,
} from "../../../utils/webhook"
import { getPaymentCollectionId } from "../../../workflows/get-payment-collection-id"
import { getStripeCart, type StripeCart, type StripeCartAddress } from "../../../workflows/get-stripe-cart"
import type { StripeOptions, StripeSessionData } from "../types"

/** Refund statuses that mean the money did not go back. `pending` and `requires_action` settle later. */
const FAILED_REFUND_STATUSES = new Set(["failed", "canceled"])

/** PaymentIntent statuses after which the storefront has nothing left to confirm. */
const SETTLED_INTENT_STATUSES = new Set(["requires_capture", "succeeded", "canceled"])

/** The keys a storefront may put in the session data. Everything else stays out of the PaymentIntent. */
const SESSION_DATA_KEYS = new Set(["session_id", "setup_future_usage", "payment_method", "express"])

/**
 * A session a wallet pays from the express checkout. The wallet sends the delivery address it
 * collected when the storefront confirms, with the publishable key, and Stripe refuses that once
 * the backend has set `shipping` with the secret key. Such a PaymentIntent gets no `shipping` here.
 */
const isExpress = (data: Record<string, unknown> | undefined) => data?.express === true

const UNEXPECTED_STATE = "payment_intent_unexpected_state"

function withoutEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== "")) as T
}

/** Session data as it may be logged: the client secret is replaced, the rest is debug-level detail. */
function forLog(data: unknown) {
  if (!data || typeof data !== "object") {
    return data
  }
  const record = data as Record<string, unknown>
  return "client_secret" in record ? { ...record, client_secret: "[redacted]" } : record
}

function toStripeAddress(address: StripeCartAddress) {
  return withoutEmpty({
    line1: address.address_1 ?? undefined,
    line2: address.address_2 ?? undefined,
    city: address.city ?? undefined,
    state: address.province ?? undefined,
    postal_code: address.postal_code ?? undefined,
    country: address.country_code ? address.country_code.toUpperCase() : undefined,
  })
}

/**
 * The PaymentIntent's `shipping` from the cart's delivery address. Stripe needs a name and a street,
 * so an address without them is left out rather than sent half empty.
 */
function toStripeShipping(address?: StripeCartAddress | null): Stripe.PaymentIntentCreateParams.Shipping | undefined {
  const name = [address?.first_name, address?.last_name].filter(Boolean).join(" ") || address?.company
  if (!address?.address_1 || !name) {
    return undefined
  }
  return withoutEmpty({
    name,
    phone: address.phone ?? undefined,
    address: toStripeAddress(address),
  }) as Stripe.PaymentIntentCreateParams.Shipping
}

function toStripeCustomer(customer: PaymentCustomerDTO): Stripe.CustomerCreateParams {
  const billing = customer.billing_address
  const name =
    customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || undefined
  return withoutEmpty({
    email: customer.email,
    name,
    phone: customer.phone ?? undefined,
    address: billing
      ? toStripeAddress({
          address_1: billing.address_1,
          address_2: billing.address_2,
          city: billing.city,
          province: billing.province,
          postal_code: billing.postal_code,
          country_code: billing.country_code,
        })
      : undefined,
  }) as Stripe.CustomerCreateParams
}

function isUnexpectedState(error: unknown): error is StripeApiError {
  return error instanceof StripeApiError && error.stripeCode === UNEXPECTED_STATE
}

abstract class StripeBase extends AbstractPaymentProvider {
  protected logger_: Logger
  protected instanceId_: string | null
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  /**
   * Validate options passed to the provider.
   */
  static validateOptions(_options: Record<string, unknown>): void {
    StripeBase.telemetry_.track("plugin.started")
  }

  constructor(container: { logger: Logger } & Record<string, any>, options?: Record<string, unknown>) {
    super(container, options)
    this.logger_ = container.logger
    this.instanceId_ = (options?.id as string | undefined) ?? null
  }

  /**
   * Resolve the merchant's Stripe settings from the integration module.
   */
  protected async resolveOptions(): Promise<StripeOptions> {
    return resolveIntegrationOptions<StripeOptions>({
      identifier: ProviderKeys.STRIPE,
      instance_id: this.instanceId_,
    })
  }

  protected getStripe(options: StripeOptions): Stripe {
    return getStripe(options.secretKey)
  }

  protected getPaymentCollectionId(sessionId: string): Promise<string> {
    return getPaymentCollectionId(sessionId)
  }

  protected getStripeCart(collectionId: string): Promise<StripeCart | null> {
    return getStripeCart(collectionId)
  }

  private call<T>(operation: string, ids: Record<string, string | undefined>, request: () => Promise<T>) {
    return callStripe(this.logger_, operation, ids, request)
  }

  /**
   * The cart behind a payment collection, for the delivery address and the receipt email. A failed
   * read never stops the payment: the PaymentIntent is created without them.
   */
  private async readCart(collectionId: string): Promise<StripeCart | null> {
    try {
      return await this.getStripeCart(collectionId)
    } catch (error) {
      this.logger_.warn(
        `StripeBase.initiatePayment: could not read the cart of payment collection ${collectionId}, creating the PaymentIntent without a delivery address: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return null
    }
  }

  /**
   * What the storefront may set on the PaymentIntent. Medusa's core provider forwarded the whole
   * session data, so a shopper could override the capture method or confirm the payment. Here a
   * logged-in customer may save the card or pay with a saved one; everything else is dropped.
   */
  private sessionParams(input: Record<string, unknown>, customerId?: string) {
    const params: Pick<Stripe.PaymentIntentCreateParams, "setup_future_usage" | "payment_method"> = {}
    const dropped = Object.keys(input).filter((key) => !SESSION_DATA_KEYS.has(key))
    const usage = input.setup_future_usage
    const method = input.payment_method

    if (usage !== undefined) {
      if (customerId && (usage === "on_session" || usage === "off_session")) {
        params.setup_future_usage = usage
      } else {
        dropped.push("setup_future_usage")
      }
    }
    if (method !== undefined) {
      if (customerId && typeof method === "string" && method.startsWith("pm_")) {
        params.payment_method = method
      } else {
        dropped.push("payment_method")
      }
    }
    return { params, dropped }
  }

  /**
   * Creates the PaymentIntent the storefront confirms. The amount, the capture method and the
   * delivery address come from Medusa and the merchant's settings, not from the storefront.
   */
  async initiatePayment({ amount, currency_code, data, context }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const input = (data ?? {}) as Record<string, unknown>
    const sessionId = input.session_id as string | undefined
    this.logger_.debug(
      `StripeBase.initiatePayment input: ${JSON.stringify({
        amount,
        currency_code,
        session_id: sessionId,
        data_keys: Object.keys(input),
        idempotency_key: context?.idempotency_key,
      })}`
    )
    if (!sessionId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Stripe initiatePayment needs data.session_id")
    }

    try {
      const options = await this.resolveOptions()
      const stripe = this.getStripe(options)
      const collectionId = await this.getPaymentCollectionId(sessionId)
      const cart = await this.readCart(collectionId)
      const customerId = context?.account_holder?.data?.id as string | undefined
      const { params, dropped } = this.sessionParams(input, customerId)
      if (dropped.length) {
        this.logger_.debug(`StripeBase.initiatePayment ignores session data keys: ${dropped.join(", ")}`)
      }

      const request: Stripe.PaymentIntentCreateParams = withoutEmpty({
        amount: toStripeAmount(amount, currency_code),
        currency: currency_code.toLowerCase(),
        capture_method: options.capture === "manual" ? "manual" : "automatic_async",
        automatic_payment_methods: { enabled: true },
        payment_method_configuration: options.paymentMethodConfiguration,
        metadata: withoutEmpty({ session_id: sessionId, payment_collection_id: collectionId, cart_id: cart?.id }),
        description: options.paymentDescription,
        statement_descriptor_suffix: options.statementDescriptorSuffix,
        shipping: isExpress(input) ? undefined : toStripeShipping(cart?.shipping_address),
        receipt_email: options.sendReceiptEmail ? cart?.email ?? undefined : undefined,
        customer: customerId,
        ...params,
      }) as Stripe.PaymentIntentCreateParams

      const intent = await this.call("createPaymentIntent", { session_id: sessionId, payment_collection_id: collectionId }, () =>
        stripe.paymentIntents.create(request, { idempotencyKey: context?.idempotency_key ?? sessionId })
      )

      const output: InitiatePaymentOutput = {
        id: intent.id,
        status: mapIntentStatus(intent),
        data: toSessionData(intent, { session_id: sessionId }, { keepClientSecret: true }),
      }
      this.logger_.debug(`StripeBase.initiatePayment output: ${JSON.stringify({ ...output, data: forLog(output.data) })}`)
      return output
    } catch (error) {
      throw this.fail("initiatePayment", error, { session_id: sessionId })
    }
  }

  /**
   * Called by Medusa when the cart completes, after the storefront confirmed the PaymentIntent.
   * Reads its status; a PaymentIntent whose amount differs from the session's is refused.
   */
  async authorizePayment({ data }: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(`StripeBase.authorizePayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const intentId = this.requireIntentId(session, "authorizePayment")

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      const intent = await this.retrieveIntent(stripe, intentId)
      if (session.amount !== undefined && intent.amount !== session.amount) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Stripe PaymentIntent ${intent.id} is for ${intent.amount} ${intent.currency}, the payment session for ${session.amount}`
        )
      }

      const status = mapIntentStatus(intent)
      const output = { status, data: scrubbed(this.sessionData(intent, session), data) }
      if (status === PaymentSessionStatus.AUTHORIZED || status === PaymentSessionStatus.CAPTURED) {
        this.logger_.info(`Stripe PaymentIntent ${intent.id} ${intent.status} for payment session ${session.session_id}`)
      }
      this.logger_.debug(`StripeBase.authorizePayment output: ${JSON.stringify({ ...output, data: forLog(output.data) })}`)
      return output
    } catch (error) {
      throw this.fail("authorizePayment", error, { session_id: session.session_id, payment_intent: intentId })
    }
  }

  /**
   * Full capture only, as Medusa's core provider does: Medusa does not pass the amount of a capture.
   * A PaymentIntent captured automatically is not captured again.
   */
  async capturePayment({ data, context }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(
      `StripeBase.capturePayment input: ${JSON.stringify({ data: forLog(session), idempotency_key: context?.idempotency_key })}`
    )
    const intentId = this.requireIntentId(session, "capturePayment")
    if (session.status === "succeeded") {
      this.logger_.debug(`StripeBase.capturePayment output: ${JSON.stringify({ data: forLog(session) })}`)
      return { data: scrubbed(session, data) }
    }

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      let intent: Stripe.PaymentIntent
      try {
        intent = await this.call("capturePaymentIntent", { payment_intent: intentId }, () =>
          stripe.paymentIntents.capture(
            intentId,
            { expand: ["payment_method", "latest_charge"] },
            { idempotencyKey: context?.idempotency_key }
          )
        )
      } catch (error) {
        // a repeated capture of a captured PaymentIntent
        if (isUnexpectedState(error) && error.paymentIntent?.status === "succeeded") {
          intent = error.paymentIntent
        } else {
          throw error
        }
      }

      const output = { data: scrubbed(toSessionData(intent, session), data) }
      this.logger_.info(`Stripe PaymentIntent ${intent.id} captured for payment session ${session.session_id}`)
      this.logger_.debug(`StripeBase.capturePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("capturePayment", error, { session_id: session.session_id, payment_intent: intentId })
    }
  }

  /**
   * Refunds the amount Medusa asks for. A payment Stripe has already refunded in full is an error:
   * Medusa's core provider reported success, and Medusa recorded a refund that never reached the
   * buyer.
   */
  async refundPayment({ amount, data, context }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(
      `StripeBase.refundPayment input: ${JSON.stringify({ amount, data: forLog(session), idempotency_key: context?.idempotency_key })}`
    )
    const intentId = this.requireIntentId(session, "refundPayment")

    try {
      if (!session.currency) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Stripe payment ${intentId} has no currency`)
      }
      const minor = toStripeAmount(amount, session.currency)
      if (minor <= 0) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "A Stripe refund needs a positive amount")
      }

      const stripe = this.getStripe(await this.resolveOptions())
      let refund: Stripe.Refund
      try {
        refund = await this.call("createRefund", { payment_intent: intentId, idempotency_key: context?.idempotency_key }, () =>
          stripe.refunds.create(
            withoutEmpty({
              payment_intent: intentId,
              amount: minor,
              metadata: withoutEmpty({ [MEDUSA_REFUND_METADATA_KEY]: context?.idempotency_key, session_id: session.session_id }),
            }) as Stripe.RefundCreateParams,
            { idempotencyKey: context?.idempotency_key }
          )
        )
      } catch (error) {
        if (error instanceof StripeApiError && error.stripeCode === "charge_already_refunded") {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            `Stripe payment ${intentId} is already refunded in full, so this refund would not reach the buyer`,
            error.stripeCode
          )
        }
        throw error
      }

      if (FAILED_REFUND_STATUSES.has(String(refund.status))) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Stripe refund ${refund.id} ended as ${refund.status}${refund.failure_reason ? `: ${refund.failure_reason}` : ""}`,
          refund.failure_reason ?? undefined
        )
      }

      const output = {
        data: scrubbed(
          { ...session, refunds: [...(session.refunds ?? []), { id: refund.id, status: refund.status, amount: refund.amount }] },
          data
        ),
      }
      this.logger_.info(`Stripe refund ${refund.id} ${refund.status} for PaymentIntent ${intentId}`)
      this.logger_.debug(`StripeBase.refundPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("refundPayment", error, { session_id: session.session_id, payment_intent: intentId })
    }
  }

  /**
   * Cancels a PaymentIntent that is not captured. A captured payment is refunded, not canceled: a
   * cancel here that refunded everything would be easy to trigger by mistake.
   */
  async cancelPayment({ data, context }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(`StripeBase.cancelPayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const intentId = readIntentId(session as Record<string, unknown>)

    if (session.status === "succeeded") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "A captured Stripe payment cannot be canceled. Refund it instead.")
    }
    if (!intentId || session.status === "canceled") {
      this.logger_.debug(`StripeBase.cancelPayment output: ${JSON.stringify({ data: forLog(session) })}`)
      return { data: scrubbed(session, data) }
    }

    try {
      const intent = await this.cancelIntent(this.getStripe(await this.resolveOptions()), intentId, context?.idempotency_key)
      if (intent.status === "succeeded") {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "A captured Stripe payment cannot be canceled. Refund it instead.")
      }
      const output = { data: scrubbed(toSessionData(intent, session), data) }
      this.logger_.debug(`StripeBase.cancelPayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      throw this.fail("cancelPayment", error, { session_id: session.session_id, payment_intent: intentId })
    }
  }

  /**
   * Medusa deletes every session when the cart total changes. The PaymentIntent behind it is
   * canceled when Stripe allows it, which also releases an authorization the new total cannot use.
   * Deleting a session never fails because of Stripe.
   */
  async deletePayment({ data }: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(`StripeBase.deletePayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const intentId = readIntentId(session as Record<string, unknown>)
    if (!intentId || session.status === "canceled" || session.status === "succeeded") {
      return { data: scrubbed(session, data) }
    }

    try {
      const intent = await this.cancelIntent(this.getStripe(await this.resolveOptions()), intentId)
      const output = { data: scrubbed(toSessionData(intent, session), data) }
      this.logger_.debug(`StripeBase.deletePayment output: ${JSON.stringify(output)}`)
      return output
    } catch (error) {
      this.logger_.warn(
        `StripeBase.deletePayment could not cancel PaymentIntent ${intentId}: ${(error as Error)?.message ?? String(error)}`
      )
      return { data: scrubbed(session, data) }
    }
  }

  /**
   * Medusa 2.21 never calls this: it replaces the session instead. Changes the amount and the
   * delivery address of a PaymentIntent the buyer has not confirmed, in case a later Medusa does.
   */
  async updatePayment({ amount, currency_code, data }: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(`StripeBase.updatePayment input: ${JSON.stringify({ amount, currency_code, data: forLog(session) })}`)
    const intentId = readIntentId(session as Record<string, unknown>)
    if (!intentId) {
      return { data: scrubbed(session, data) }
    }

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      const current = await this.retrieveIntent(stripe, intentId)
      if (!UNCONFIRMED_INTENT_STATUSES.has(current.status)) {
        return { data: scrubbed(this.sessionData(current, session), data) }
      }
      const cart = session.session_id ? await this.readCart(await this.getPaymentCollectionId(session.session_id)) : null
      const intent = await this.call("updatePaymentIntent", { payment_intent: intentId }, () =>
        stripe.paymentIntents.update(
          intentId,
          withoutEmpty({
            amount: toStripeAmount(amount, currency_code),
            shipping: isExpress(data) ? undefined : toStripeShipping(cart?.shipping_address),
          }) as Stripe.PaymentIntentUpdateParams
        )
      )
      const output = { data: scrubbed(this.sessionData(intent, session), data) }
      this.logger_.debug(`StripeBase.updatePayment output: ${JSON.stringify({ data: forLog(output.data) })}`)
      return output
    } catch (error) {
      throw this.fail("updatePayment", error, { session_id: session.session_id, payment_intent: intentId })
    }
  }

  async getPaymentStatus({ data }: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(`StripeBase.getPaymentStatus input: ${JSON.stringify({ data: forLog(session) })}`)
    const intentId = readIntentId(session as Record<string, unknown>)
    if (!intentId) {
      return { status: PaymentSessionStatus.PENDING, data: session }
    }

    try {
      const intent = await this.retrieveIntent(this.getStripe(await this.resolveOptions()), intentId)
      const output = { status: mapIntentStatus(intent), data: scrubbed(this.sessionData(intent, session), data) }
      this.logger_.debug(`StripeBase.getPaymentStatus output: ${JSON.stringify({ ...output, data: forLog(output.data) })}`)
      return output
    } catch (error) {
      throw this.fail("getPaymentStatus", error, { session_id: session.session_id, payment_intent: intentId })
    }
  }

  /** The PaymentIntent's current state, with amounts in minor units like everywhere else. */
  async retrievePayment({ data }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const session = normalizeSessionData(data)
    this.logger_.debug(`StripeBase.retrievePayment input: ${JSON.stringify({ data: forLog(session) })}`)
    const intentId = this.requireIntentId(session, "retrievePayment")

    try {
      const intent = await this.retrieveIntent(this.getStripe(await this.resolveOptions()), intentId)
      const output = { data: scrubbed(this.sessionData(intent, session), data) }
      this.logger_.debug(`StripeBase.retrievePayment output: ${JSON.stringify({ data: forLog(output.data) })}`)
      return output
    } catch (error) {
      throw this.fail("retrievePayment", error, { session_id: session.session_id, payment_intent: intentId })
    }
  }

  async createAccountHolder({ context }: CreateAccountHolderInput): Promise<CreateAccountHolderOutput> {
    const { account_holder, customer, idempotency_key } = context
    this.logger_.debug(`StripeBase.createAccountHolder input: ${JSON.stringify({ customer_id: customer?.id, account_holder: account_holder?.data?.id })}`)
    if (account_holder?.data?.id) {
      return { id: account_holder.data.id as string }
    }
    if (!customer) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Stripe createAccountHolder needs a customer")
    }

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      const created = await this.call("createCustomer", { customer_id: customer.id }, () =>
        stripe.customers.create(
          { ...toStripeCustomer(customer), metadata: { medusa_customer_id: customer.id } },
          { idempotencyKey: idempotency_key }
        )
      )
      const output = { id: created.id, data: withoutEmpty({ id: created.id, email: created.email }) }
      this.logger_.debug(`StripeBase.createAccountHolder output: ${JSON.stringify({ id: output.id })}`)
      return output
    } catch (error) {
      throw this.fail("createAccountHolder", error, { customer_id: customer.id })
    }
  }

  async updateAccountHolder({ context }: UpdateAccountHolderInput): Promise<UpdateAccountHolderOutput> {
    const { account_holder, customer, idempotency_key } = context
    const customerId = account_holder?.data?.id as string | undefined
    this.logger_.debug(`StripeBase.updateAccountHolder input: ${JSON.stringify({ customer_id: customer?.id, account_holder: customerId })}`)
    if (!customerId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Stripe updateAccountHolder needs an account holder")
    }
    // without customer details there is nothing to update
    if (!customer) {
      return {}
    }

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      const updated = await this.call("updateCustomer", { stripe_customer: customerId }, () =>
        stripe.customers.update(customerId, toStripeCustomer(customer), { idempotencyKey: idempotency_key })
      )
      return { data: withoutEmpty({ id: updated.id, email: updated.email }) }
    } catch (error) {
      throw this.fail("updateAccountHolder", error, { customer_id: customer.id, stripe_customer: customerId })
    }
  }

  async deleteAccountHolder({ context }: DeleteAccountHolderInput): Promise<DeleteAccountHolderOutput> {
    const customerId = context.account_holder?.data?.id as string | undefined
    this.logger_.debug(`StripeBase.deleteAccountHolder input: ${JSON.stringify({ account_holder: customerId })}`)
    if (!customerId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Stripe deleteAccountHolder needs an account holder")
    }

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      await this.call("deleteCustomer", { stripe_customer: customerId }, () => stripe.customers.del(customerId))
      return {}
    } catch (error) {
      throw this.fail("deleteAccountHolder", error, { stripe_customer: customerId })
    }
  }

  async listPaymentMethods({ context }: ListPaymentMethodsInput): Promise<ListPaymentMethodsOutput> {
    const customerId = context?.account_holder?.data?.id as string | undefined
    this.logger_.debug(`StripeBase.listPaymentMethods input: ${JSON.stringify({ account_holder: customerId })}`)
    if (!customerId) {
      return []
    }

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      // the maximum page is enough for a customer's saved methods
      const methods = await this.call("listPaymentMethods", { stripe_customer: customerId }, () =>
        stripe.customers.listPaymentMethods(customerId, { limit: 100 })
      )
      return methods.data.map((method) => ({
        id: method.id,
        data: withoutEmpty({
          id: method.id,
          type: method.type,
          card_brand: method.card?.brand,
          card_last4: method.card?.last4,
          card_exp_month: method.card?.exp_month,
          card_exp_year: method.card?.exp_year,
          wallet: method.card?.wallet?.type,
        }),
      }))
    } catch (error) {
      throw this.fail("listPaymentMethods", error, { stripe_customer: customerId })
    }
  }

  /**
   * Starts saving a payment method with a SetupIntent the storefront confirms. Its client secret is
   * returned because the storefront needs it to confirm.
   */
  async savePaymentMethod({ context, data }: SavePaymentMethodInput): Promise<SavePaymentMethodOutput> {
    const customerId = context?.account_holder?.data?.id as string | undefined
    this.logger_.debug(`StripeBase.savePaymentMethod input: ${JSON.stringify({ account_holder: customerId, data_keys: Object.keys(data ?? {}) })}`)
    if (!customerId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Stripe savePaymentMethod needs an account holder")
    }
    const method = data?.payment_method

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      const intent = await this.call("createSetupIntent", { stripe_customer: customerId }, () =>
        stripe.setupIntents.create(
          withoutEmpty({
            customer: customerId,
            usage: "off_session",
            automatic_payment_methods: { enabled: true },
            payment_method: typeof method === "string" && method.startsWith("pm_") ? method : undefined,
          }) as Stripe.SetupIntentCreateParams,
          { idempotencyKey: context?.idempotency_key }
        )
      )
      return {
        id: intent.id,
        data: withoutEmpty({ id: intent.id, client_secret: intent.client_secret, status: intent.status, customer: customerId }),
      }
    } catch (error) {
      throw this.fail("savePaymentMethod", error, { stripe_customer: customerId })
    }
  }

  /** Detaches a saved payment method, only from the customer it belongs to. */
  async deletePaymentMethod({ context, data }: DeletePaymentMethodInput): Promise<DeletePaymentMethodOutput> {
    const methodId = data?.id
    const customerId = context?.account_holder?.data?.id as string | undefined
    this.logger_.debug(`StripeBase.deletePaymentMethod input: ${JSON.stringify({ payment_method: methodId, account_holder: customerId })}`)
    if (!methodId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Stripe deletePaymentMethod needs the payment method id")
    }

    try {
      const stripe = this.getStripe(await this.resolveOptions())
      const method = await this.call("retrievePaymentMethod", { payment_method: methodId }, () =>
        stripe.paymentMethods.retrieve(methodId)
      )
      const owner = typeof method.customer === "string" ? method.customer : method.customer?.id
      if (!customerId || owner !== customerId) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Payment method ${methodId} does not belong to this customer`)
      }
      await this.call("detachPaymentMethod", { payment_method: methodId }, () =>
        stripe.paymentMethods.detach(methodId, {}, { idempotencyKey: context?.idempotency_key })
      )
      return {}
    } catch (error) {
      throw this.fail("deletePaymentMethod", error, { payment_method: methodId, stripe_customer: customerId })
    }
  }

  /**
   * Maps a verified Stripe event to a Medusa payment action. Medusa acts on `authorized` and
   * `captured`, completing a cart the storefront left after the buyer paid; a repeated event changes
   * nothing, because cart completion and capture are idempotent in Medusa.
   */
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const unsupported = { action: PaymentActions.NOT_SUPPORTED }
    const event = await this.constructWebhookEvent(payload)
    const object = (event?.data?.object ?? {}) as Partial<Stripe.PaymentIntent> & { id?: string }
    this.logger_.debug(
      `StripeBase.getWebhookActionAndData input: ${JSON.stringify({ id: event?.id, type: event?.type, object: object.id })}`
    )
    if (!event) {
      return unsupported
    }

    if (UNRECORDED_WEBHOOK_EVENTS.has(event.type)) {
      this.logUnrecordedEvent(event)
      return unsupported
    }
    const mapping = WEBHOOK_ACTIONS[event.type]
    if (!mapping) {
      this.logger_.debug(`StripeBase.getWebhookActionAndData output: ${JSON.stringify(unsupported)}`)
      return unsupported
    }
    const sessionId = object.metadata?.session_id
    if (!sessionId) {
      this.logger_.debug(`Stripe webhook ${event.id} (${event.type}) names no Medusa payment session, ignoring it`)
      return unsupported
    }

    const minor = Number(object[mapping.amount] ?? 0)
    const output = {
      action: mapping.action,
      data: { session_id: sessionId, amount: object.currency ? fromStripeAmount(minor, object.currency) : 0 },
    }
    this.logger_.debug(`StripeBase.getWebhookActionAndData output: ${JSON.stringify(output)}`)
    return output
  }

  /**
   * Logs a refund or a dispute that Medusa does not record. A refund the plugin made for Medusa carries
   * Medusa's refund id in its metadata: its creation is already in the order, and its failure is the
   * one event here that leaves the order wrong, counting money as returned that the buyer never got.
   */
  private logUnrecordedEvent(event: Stripe.Event) {
    const object = event.data.object as { id?: string; metadata?: Stripe.Metadata | null; payment_intent?: unknown }
    const medusaRefundId = event.type.startsWith("refund.") ? object.metadata?.[MEDUSA_REFUND_METADATA_KEY] : undefined
    if (medusaRefundId && event.type === "refund.created") {
      this.logger_.debug(`Stripe webhook ${event.id}: refund ${object.id} was made from Medusa refund ${medusaRefundId}`)
      return
    }
    if (medusaRefundId && event.type === "refund.failed") {
      const intent = typeof object.payment_intent === "string" ? ` for PaymentIntent ${object.payment_intent}` : ""
      this.logger_.warn(
        `Stripe refund ${object.id}${intent} failed after Medusa recorded it as refund ${medusaRefundId}. ` +
          "The order counts the money as returned, so refund the buyer again in the Stripe Dashboard"
      )
      return
    }
    this.logger_.info(
      `Stripe webhook ${event.id}: ${event.type} for ${object.id}. Medusa does not record refunds and disputes made in Stripe`
    )
  }

  /**
   * The event if its signature is valid, otherwise `null`: no signing secret configured, no
   * `Stripe-Signature` header, a body that is not the raw request, a wrong signature, or a timestamp
   * older than Stripe's five-minute tolerance. The check is local, no call to Stripe.
   */
  protected async constructWebhookEvent(payload: ProviderWebhookPayload["payload"]): Promise<Stripe.Event | null> {
    const options = await this.resolveOptions()
    if (!options.webhookSecret) {
      this.logger_.warn("Stripe webhook received, but no webhook signing key is configured, so it cannot be verified and is ignored")
      return null
    }
    const signature = readSignature(payload.headers as Record<string, unknown>)
    const body = readRawBody(payload.rawData)
    if (!signature || !body) {
      this.logger_.warn(`Stripe webhook without ${signature ? "a raw body" : "a Stripe-Signature header"}, ignoring it`)
      return null
    }

    try {
      return this.getStripe(options).webhooks.constructEvent(body, signature, options.webhookSecret)
    } catch (error) {
      this.logger_.warn(`Stripe webhook failed the signature check: ${(error as Error)?.message ?? String(error)}`)
      return null
    }
  }

  private retrieveIntent(stripe: Stripe, intentId: string): Promise<Stripe.PaymentIntent> {
    return this.call("retrievePaymentIntent", { payment_intent: intentId }, () =>
      stripe.paymentIntents.retrieve(intentId, { expand: ["payment_method", "latest_charge"] })
    )
  }

  /** Cancels a PaymentIntent; one Stripe has already canceled or captured is returned as it is. */
  private async cancelIntent(stripe: Stripe, intentId: string, idempotencyKey?: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.call("cancelPaymentIntent", { payment_intent: intentId }, () =>
        stripe.paymentIntents.cancel(intentId, {}, idempotencyKey ? { idempotencyKey } : undefined)
      )
    } catch (error) {
      if (isUnexpectedState(error) && error.paymentIntent && ["canceled", "succeeded"].includes(error.paymentIntent.status)) {
        return error.paymentIntent
      }
      throw error
    }
  }

  /** Session data that keeps the client secret only while the storefront may still need it. */
  private sessionData(intent: Stripe.PaymentIntent, session: StripeSessionData): StripeSessionData {
    return toSessionData(intent, session, { keepClientSecret: !SETTLED_INTENT_STATUSES.has(intent.status) })
  }

  private requireIntentId(session: StripeSessionData, method: string): string {
    const id = readIntentId(session as Record<string, unknown>)
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Stripe ${method} needs the PaymentIntent id in data.id`)
    }
    return id
  }

  /** Logs a failure handed back to Medusa, with Stripe's error code and the Medusa ids. */
  private fail(method: string, error: unknown, ids: Record<string, string | undefined>): unknown {
    const code = error instanceof StripeApiError ? error.stripeCode : error instanceof MedusaError ? error.code : undefined
    // workflow failures arrive as plain objects, not Error instances
    const message = (error as { message?: string } | undefined)?.message ?? String(error)
    this.logger_.error(`StripeBase.${method} failed: ${message}${code ? ` code=${code}` : ""} ${JSON.stringify(withoutEmpty(ids))}`)
    return error
  }
}

export default StripeBase
