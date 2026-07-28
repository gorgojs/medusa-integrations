import {
  YooCheckout,
  ICapturePayment,
  IConfirmationWithoutData,
  ICreatePayment,
  ICreateRefund,
  IReceipt,
  PaymentStatuses,
  Payment,
  Refund,
  WebHookEvents
} from "@a2seven/yoo-checkout"
import axios, { AxiosError } from "axios"
import {
  AbstractPaymentProvider,
  PaymentSessionStatus,
  PaymentActions,
  BigNumber,
  MedusaError,
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
  ProviderWebhookPayload,
  WebhookActionResult,
  RefundPaymentInput,
  RefundPaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  RetrievePaymentOutput,
  RetrievePaymentInput,
  Logger
} from "@medusajs/framework/types"
import { createTelemetryClient } from "@gorgo/telemetry"
import {
  buildReceiptTemplate,
  buildRefundReceiptSimple,
  generateReceipt,
  formatCurrency
} from "../utils"
import { PaymentOptions, PaymentProviderKeys, YookassaEvent, TaxSystemCode, VatCode } from "../types"
import { resolveIntegrationOptions } from "@gorgo/medusa-integration"
import { YookassaOptions } from "../../integration-yookassa/services/yookassa-integration"

abstract class YookassaBase extends AbstractPaymentProvider {
  protected logger_: Logger
  protected container_: Record<string, any>
  protected instanceId_: string | null
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  /** 
   * Validate options passed to the provider.
   */
  static validateOptions(_options: Record<string, unknown>): void {
    YookassaBase.telemetry_.track("plugin.started")
  }

  /** 
   * Construct a new instance of the YookassaBase provider.
   */
  protected constructor(container: { logger: Logger } & Record<string, any>, options?: Record<string, unknown>) {
    // @ts-ignore
    super(...arguments)

    this.logger_ = container.logger
    this.container_ = container
    this.instanceId_ = (options?.id as string | undefined) ?? null
  }

  abstract get paymentOptions(): PaymentOptions

  /** 
   * Resolve YooKassa integration options from the Medusa integration provider.
   */
  protected async resolveOptions(): Promise<YookassaOptions> {
    return resolveIntegrationOptions<YookassaOptions>({
      identifier: YookassaBase.identifier,
      instance_id: this.instanceId_
    })
  }

  /** 
   * Build a YooKassa client from resolved options. 
   */
  protected getClient(options: YookassaOptions): YooCheckout {
    return new YooCheckout({ shopId: options.shopId, secretKey: options.secretKey })
  }

  /** 
   * Normalize payment parameters for YooKassa API request.
   */
  private normalizePaymentParameters(
    options: YookassaOptions,
    extra?: Record<string, unknown>
  ): Partial<ICreatePayment> {
    const res = {} as Partial<ICreatePayment>

    res.description =
      extra?.description as string ??
      options.paymentDescription

    res.capture =
      extra?.capture as boolean ??
      this.paymentOptions.capture ??
      options.capture

    res.payment_method_data = this.paymentOptions?.payment_method_data

    res.confirmation = extra?.confirmation as IConfirmationWithoutData | undefined

    return res
  }

  /**
   * Initiate a new payment.
   */
  async initiatePayment({
    currency_code,
    amount,
    data,
    context,
  }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    this.logger_.debug(`YookassaBase.initiatePayment input:\n${JSON.stringify({ currency_code, amount, data, context }, null, 2)}`)

    const options = await this.resolveOptions()
    const client = this.getClient(options)
    const cart = data?.cart as Record<string, any>
    const additionalParameters = this.normalizePaymentParameters(options, data)

    let receipt = {} as IReceipt
    if (options.useReceipt && cart) {
      try {
        receipt = generateReceipt(
          options.taxSystemCode as TaxSystemCode | undefined,
          options.taxItemDefault as VatCode,
          options.taxShippingDefault as VatCode,
          cart
        )
      } catch (e: Error | unknown) {
        this.logger_.warn(`Receipt generation failed in YookassaBase.initiatePayment for cart ${cart?.id}: ${e instanceof Error ? e.message : String(e)}. Skipping receipt generation.`)
      }
    }
    const receiptTemplate = buildReceiptTemplate(receipt)
    const createPayload: ICreatePayment = {
      amount: {
        value: String(Number(amount).toFixed(2)),
        currency: currency_code.toUpperCase(),
      },
      metadata: {
        session_id: data?.session_id as string,
        receip_tmp: receiptTemplate
      },
      ...additionalParameters,
      ...(options.useReceipt && receipt?.items?.length ? { receipt } : {}),
    }

    try {
      const response = await client.createPayment(createPayload, context?.idempotency_key)
      const paymentId = "id" in response ? response.id : (data?.session_id as string)

      const output = {
        id: paymentId,
        data: response as unknown as Record<string, unknown>,
      }
      this.logger_.debug(`YookassaBase.initiatePayment output:\n${JSON.stringify(output, null, 2)}`)

      return output
    } catch (e) {
      throw this.buildError("An error occurred in initiatePayment", e)
    }
  }

  /**
   * Get payment status.
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    this.logger_.debug(`YookassaBase.getPaymentStatus input:\n${JSON.stringify(input, null, 2)}`)

    const id = input.data?.id as string
    if (!id) {
      throw this.buildError(
        "No payment ID provided while getting payment status",
        new Error("No payment ID provided")
      )
    }

    const options = await this.resolveOptions()
    const client = this.getClient(options)

    try {
      const payment = await client.getPayment(id)
      const paymentData = payment as unknown as Record<string, unknown>

      let output: GetPaymentStatusOutput
      switch (payment.status) {
        case PaymentStatuses.pending:
          output = { status: PaymentSessionStatus.PENDING, data: paymentData }
          break
        case PaymentStatuses.canceled:
          output = { status: PaymentSessionStatus.CANCELED, data: paymentData }
          break
        case PaymentStatuses.waiting_for_capture:
          output = { status: PaymentSessionStatus.AUTHORIZED, data: paymentData }
          break
        case PaymentStatuses.succeeded:
          output = { status: PaymentSessionStatus.CAPTURED, data: paymentData }
          break
        default:
          output = { status: PaymentSessionStatus.PENDING, data: paymentData }
      }
      this.logger_.debug(`YookassaBase.getPaymentStatus output:\n${JSON.stringify(output, null, 2)}`)

      return output
    } catch (e) {
      throw this.buildError("An error occurred in getPaymentStatus", e)
    }
  }

  /**
   * Capture an existing payment.
   */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    this.logger_.debug(`YookassaBase.capturePayment input:\n${JSON.stringify(input, null, 2)}`)

    const payment = input.data as unknown as Payment

    if (payment.status === PaymentStatuses.succeeded)
      return { data: input }

    const options = await this.resolveOptions()
    const client = this.getClient(options)

    const payload: ICapturePayment = {
      amount: payment.amount
    }
    const idempotencyKey = input.context?.idempotency_key
    try {
      const response = await client.capturePayment(payment.id, payload, idempotencyKey)

      const output = { data: response as unknown as Record<string, unknown> }
      this.logger_.debug(`YookassaBase.capturePayment output:\n${JSON.stringify(output, null, 2)}`)

      return output
    } catch (e) {
      throw this.buildError("An error occurred in capturePayment", e)
    }
  }

  /**
   * Authorize a payment by retrieving its status.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    this.logger_.debug(`YookassaBase.authorizePayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = await this.getPaymentStatus(input)
    this.logger_.debug(`YookassaBase.authorizePayment output:\n${JSON.stringify(output, null, 2)}`)

    return output
  }

  /**
   * Cancel an existing payment.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    this.logger_.debug(`YookassaBase.cancelPayment input:\n${JSON.stringify(input, null, 2)}`)

    const paymentId = input.data?.id as string
    const idempotencyKey = input.context?.idempotency_key

    const options = await this.resolveOptions()
    const client = this.getClient(options)

    try {
      const response = await client.cancelPayment(paymentId, idempotencyKey)

      const output = { data: response as unknown as Record<string, unknown> }
      this.logger_.debug(`YookassaBase.cancelPayment output:\n${JSON.stringify(output, null, 2)}`)

      return output
    } catch (e) {
      throw this.buildError("An error occurred in cancelPayment", e)
    }
  }

  /**
   * Retrieve a payment.
   */
  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    this.logger_.debug(`YookassaBase.retrievePayment input:\n${JSON.stringify(input, null, 2)}`)

    const options = await this.resolveOptions()
    const client = this.getClient(options)

    try {
      const payment = await client.getPayment(input.data?.id as string)

      const output = { data: payment as unknown as Record<string, unknown> }
      this.logger_.debug(`YookassaBase.retrievePayment output:\n${JSON.stringify(output, null, 2)}`)

      return output
    } catch (e) {
      throw this.buildError("An error occurred in retrievePayment", e)
    }
  }

  /**
   * Refund a payment.
   */
  async refundPayment({
    amount,
    data,
    context,
  }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    this.logger_.debug(`YookassaBase.refundPayment input:\n${JSON.stringify({ amount, data, context }, null, 2)}`)

    const payment = data as unknown as Payment
    const id = payment?.id
    if (!id) {
      throw this.buildError(
        "No payment ID provided while refunding payment",
        new Error("No payment ID provided")
      )
    }

    const options = await this.resolveOptions()
    const client = this.getClient(options)

    const refundAmount = formatCurrency(
      new BigNumber(amount).numeric.toString(),
      payment?.amount?.currency
    )
    const receipt = buildRefundReceiptSimple(refundAmount, payment.metadata.receip_tmp)

    const payload: ICreateRefund = {
      payment_id: id,
      amount: {
        value: new BigNumber(amount).numeric.toString(),
        currency: payment?.amount?.currency,
      },
      ...(options.useReceipt && refundAmount !== payment?.amount?.value ? { receipt: receipt } : {}),
    }

    try {
      await client.createRefund(payload, context?.idempotency_key)

      const output = await this.retrievePayment({ data })
      this.logger_.debug(`YookassaBase.refundPayment output:\n${JSON.stringify(output, null, 2)}`)

      return output
    } catch (e) {
      throw this.buildError("An error occurred in refundPayment", e)
    }
  }

  /**
   * Delete a payment.
   * Payment deletion is not supported by YooKassa.
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    this.logger_.debug(`YookassaBase.deletePayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = input
    this.logger_.debug(`YookassaBase.deletePayment output:\n${JSON.stringify(output, null, 2)}`)

    return output
  }

  /**
   * Update a payment.
   * Payment update is not supported by YooKassa.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    this.logger_.debug(`YookassaBase.updatePayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = input
    this.logger_.debug(`YookassaBase.updatePayment output:\n${JSON.stringify(output, null, 2)}`)

    return output
  }

  /**
   * Process webhook event and map it to Medusa action.
   */
  async getWebhookActionAndData(webhookData: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    this.logger_.debug(`YookassaBase.getWebhookActionAndData payload:\n${JSON.stringify(webhookData, null, 2)}`)

    const isValid = await this.isWebhookEventValid(webhookData)
    if (!isValid)
      return {
        action: PaymentActions.NOT_SUPPORTED
      }

    const { event, object } = webhookData.data as unknown as YookassaEvent

    let result: WebhookActionResult
    switch (event) {
      case WebHookEvents["payment.succeeded"]:
        result = {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id: (object as Payment).metadata.session_id,
            amount: (object as Payment).amount.value,
          }
        }
        break
      case WebHookEvents["payment.waiting_for_capture"]:
        result = {
          action: PaymentActions.AUTHORIZED,
          data: {
            session_id: (object as Payment).metadata.session_id,
            amount: (object as Payment).amount.value,
          },
        }
        break
      case WebHookEvents["payment.canceled"]:
        result = {
          action: PaymentActions.CANCELED,
          data: {
            session_id: (object as Payment).metadata.session_id,
            amount: (object as Payment).amount.value,
          },
        }
        break
      default:
        result = {
          action: PaymentActions.NOT_SUPPORTED
        }
    }
    this.logger_.debug(`YookassaBase.getWebhookActionAndData result:\n${JSON.stringify(result, null, 2)}`)

    return result
  }

  /**
   * Validate Webhook event
   * @param {object} webhookData - the data of the webhook request: req.body
   * @returns {boolean} - stutus of validation
   */
  protected async isWebhookEventValid(webhookData: ProviderWebhookPayload["payload"]): Promise<boolean> {
    const [object, status] = (webhookData.data.event as YookassaEvent["event"]).split('.');

    const options = await this.resolveOptions()
    const client = this.getClient(options)

    try {
      switch (object) {
        case "payment":
          const payment = await client.getPayment((webhookData.data.object as Payment).id)
          return payment.status === status
        case "refund":
          const refund = await client.getRefund((webhookData.data.object as Refund).id)
          return refund.status === status
        default:
          return false
      }
    } catch (e) {
      throw this.buildError(`An error occurred in isWebhookEventValid when validating a ${object}`, e)
    }
  }

  /**
   * Helper to build errors with additional context.
   */
  protected buildError(message: string, error: Error | AxiosError): Error {
    if (axios.isAxiosError(error)) {
      return new Error(
        `${message}: ${error.response?.status} ${error.response?.data?.code} - ${error.response?.data?.description}`.trim()
      )
    }
    return new Error(
      `${message}: ${error.message}`.trim()
    )
  }
}

export default YookassaBase
