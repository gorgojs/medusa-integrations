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
  isDefined
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
import {
  PaymentOptions,
  taxSystemCodes,
  vatCodes,
  YookassaOptions,
  YookassaEvent,
} from "../types"

type InjectedDependencies = {
  logger: Logger
}

abstract class YookassaBase extends AbstractPaymentProvider<YookassaOptions> {
  protected readonly options_: YookassaOptions
  protected yooCheckout_: YooCheckout
  protected logger_: Logger
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  static validateOptions(options: YookassaOptions): void {
    YookassaBase.telemetry_.track("plugin.started")
    if (!isDefined(options.shopId)) {
      throw new Error("Required option `shopId` is missing in YooKassa plugin")
    }
    if (!isDefined(options.secretKey)) {
      throw new Error("Required option `secretKey` is missing in YooKassa plugin")
    }
    if (isDefined(options.useReceipt)) {
      if (options.useAtolOnlineFFD120) {
        if (!isDefined(options.taxSystemCode)) {
          throw new Error("Required option `taxSystemCode` is missing in YooKassa provider")
        } else if (!taxSystemCodes.includes(options.taxSystemCode)) {
          throw new Error(`Invalid option \`taxSystemCode\` provided in YooKassa provider. Valid values are: ${taxSystemCodes.join(", ")}`)
        }
      }
      if (!isDefined(options.taxItemDefault)) {
        throw new Error("Required option `taxItemDefault` is missing in YooKassa provider")
      } else if (!vatCodes.includes(options.taxItemDefault)) {
        throw new Error(`Invalid option \`taxItemDefault\` provided in YooKassa provider. Valid values are: ${vatCodes.join(", ")}`)
      }
      if (!isDefined(options.taxShippingDefault)) {
        throw new Error("Required option `taxShippingDefault` is missing in YooKassa provider")
      } else if (!vatCodes.includes(options.taxShippingDefault)) {
        throw new Error(`Invalid option \`taxShippingDefault\` provided in YooKassa provider. Valid values are: ${vatCodes.join(", ")}`)
      }
    }
  }

  protected constructor(container: InjectedDependencies, options: YookassaOptions) {
    // @ts-ignore
    super(...arguments)

    this.logger_ = container.logger
    this.options_ = options
    this.yooCheckout_ = new YooCheckout({
      shopId: options.shopId,
      secretKey: options.secretKey,
    })
  }

  abstract get paymentOptions(): PaymentOptions

  get options(): YookassaOptions {
    return this.options_
  }

  private normalizePaymentParameters(
    extra?: Record<string, unknown>
  ): Partial<ICreatePayment> {
    const res = {} as Partial<ICreatePayment>

    res.description =
      extra?.description as string ??
      this.options_?.paymentDescription

    res.capture =
      extra?.capture as boolean ??
      this.paymentOptions.capture ??
      this.options_.capture

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

    const cart = data?.cart as Record<string, any>
    const additionalParameters = this.normalizePaymentParameters(data)

    let receipt = {} as IReceipt
    if (this.options_.useReceipt && cart) {
      try {
        receipt = generateReceipt(
          this.options_.taxSystemCode,
          this.options_.taxItemDefault!,
          this.options_.taxShippingDefault!,
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
        currency: currency_code.toUpperCase(), // Medusa stores currency codes in lower case of ISO-4217
      },
      metadata: {
        session_id: data?.session_id as string,
        receip_tmp: receiptTemplate
      },
      ...additionalParameters,
      ...(this.options_.useReceipt && receipt?.items?.length ? { receipt } : {}),
    }

    try {
      const response = await this.yooCheckout_.createPayment(createPayload, context?.idempotency_key)
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
   * Retrieve payment status and map it to Medusa status.
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

    try {
      const payment = await this.yooCheckout_.getPayment(id)
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

    // Avoid autoCapture in https://github.com/medusajs/medusa/blob/ceb504db2ce44dec43dff652fb306eb4e4f6059e/packages/modules/payment/src/services/payment-module.ts#L590
    if (payment.status === PaymentStatuses.succeeded)
      return { data: input }

    const payload: ICapturePayment = {
      amount: payment.amount
    }
    const idempotencyKey = input.context?.idempotency_key
    try {
      const response = await this.yooCheckout_.capturePayment(payment.id, payload, idempotencyKey)

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

    try {
      const response = await this.yooCheckout_.cancelPayment(paymentId, idempotencyKey)

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

    try {
      const payment = await this.yooCheckout_.getPayment(input.data?.id as string)

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
      ...(this.options_.useReceipt && refundAmount !== payment?.amount?.value ? { receipt: receipt } : {}),
    }

    try {
      await this.yooCheckout_.createRefund(payload, context?.idempotency_key)

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
    try {
      switch (object) {
        case "payment":
          const payment = await this.yooCheckout_.getPayment((webhookData.data.object as Payment).id)
          return payment.status === status
        case "refund":
          const refund = await this.yooCheckout_.getRefund((webhookData.data.object as Refund).id)
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
