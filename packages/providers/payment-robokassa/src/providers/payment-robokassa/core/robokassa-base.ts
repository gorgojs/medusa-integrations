import {
  AbstractPaymentProvider,
  PaymentSessionStatus,
  PaymentActions,
  isDefined
} from "@medusajs/framework/utils"
import {
  InitiatePaymentInput, InitiatePaymentOutput,
  CapturePaymentInput, CapturePaymentOutput,
  RefundPaymentInput, RefundPaymentOutput,
  CancelPaymentInput, CancelPaymentOutput,
  RetrievePaymentInput, RetrievePaymentOutput,
  GetPaymentStatusInput, GetPaymentStatusOutput,
  ProviderWebhookPayload, WebhookActionResult, Logger,
  AuthorizePaymentInput, AuthorizePaymentOutput,
  DeletePaymentInput, DeletePaymentOutput,
  UpdatePaymentInput, UpdatePaymentOutput,
} from "@medusajs/framework/types"
import {
  HashAlgorithms,
  Payment,
  Receipt,
  RobokassaEvent,
  RobokassaOptions,
  taxations,
  taxes
} from "../types"

// Maps Robokassa numeric state codes to Medusa PaymentSessionStatus.
// Documented at: https://docs.robokassa.ru/en/pay-interface/checking-operation-state/
const PaymentStateCodesMap: Record<number, PaymentSessionStatus> = {
  3: PaymentSessionStatus.PENDING,
  5: PaymentSessionStatus.PENDING,
  10: PaymentSessionStatus.CANCELED,
  20: PaymentSessionStatus.AUTHORIZED,
  50: PaymentSessionStatus.PENDING,
  60: PaymentSessionStatus.CANCELED,
  80: PaymentSessionStatus.REQUIRES_MORE,
  100: PaymentSessionStatus.CAPTURED,
}
import axios, { AxiosError } from "axios"
import { XMLParser } from 'fast-xml-parser'
import {
  createSignature,
  generateReceipt,
  stringToNumberHash
} from "../utils"
import { createHash } from "crypto"
import { createTelemetryClient } from "@gorgo/telemetry"

abstract class RobokassaBase extends AbstractPaymentProvider<RobokassaOptions> {
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  protected options_: RobokassaOptions
  protected logger_: Logger
  protected baseUrl_ = "https://auth.robokassa.ru"
  protected paymentUrl_ = `${this.baseUrl_}/Merchant/Index.aspx`
  protected getPaymentUrl_ = `${this.baseUrl_}/Merchant/WebService/Service.asmx/OpStateExt`
  protected capturePaymentUrl_ = `${this.baseUrl_}/Merchant/Payment/Confirm`

  static validateOptions(options: RobokassaOptions): void {
    RobokassaBase.telemetry_.track("plugin.started")

    if (!isDefined(options.merchantLogin)) {
      throw new Error("Required option `merchantLogin` is missing in Robokassa provider")
    }
    if (!isDefined(options.password1)) {
      throw new Error("Required option `password1` is missing in Robokassa provider")
    }
    if (!isDefined(options.password2)) {
      throw new Error("Required option `password2` is missing in Robokassa provider")
    }
    if (!isDefined(options.hashAlgorithm) || !HashAlgorithms.includes(options.hashAlgorithm as (typeof HashAlgorithms)[number])) {
      throw new Error("Required option `hashAlgorithm` is missing in Robokassa provider")
    }
    if (options.useReceipt == true) {
      if (!isDefined(options.taxation)) {
        throw new Error("Required option `taxation` is missing in Robokassa provider")
      } else if (!taxations.includes(options.taxation)) {
        throw new Error(`Invalid option \`taxation\` provided in Robokassa provider. Valid values are: ${taxations.join(", ")}`)
      }
      if (!isDefined(options.taxItemDefault)) {
        throw new Error("Required option `taxItemDefault` is missing in Robokassa provider")
      } else if (!taxes.includes(options.taxItemDefault)) {
        throw new Error(`Invalid option \`taxItemDefault\` provided in Robokassa provider. Valid values are: ${taxes.join(", ")}`)
      }
      if (!isDefined(options.taxShippingDefault)) {
        throw new Error("Required option `taxShippingDefault` is missing in Robokassa provider")
      } else if (!taxes.includes(options.taxShippingDefault)) {
        throw new Error(`Invalid option \`taxShippingDefault\` provided in Robokassa provider. Valid values are: ${taxes.join(", ")}`)
      }
    }
  }

  constructor(container: { logger: Logger }, options: RobokassaOptions) {
    super(container, options)
    this.options_ = options
    this.logger_ = container.logger
  }

  protected createSignature(
    signatureParams: string[],
  ) {
    const concatenatedParams = signatureParams.filter(v => v).join(":")
    const res = createHash(this.options_.hashAlgorithm).update(concatenatedParams).digest('hex')

    return res
  }

  private normalizePaymentParameters(
    extra?: InitiatePaymentInput
  ): Partial<Payment> {
    const res = {} as Partial<Payment>

    if (extra?.data?.SuccessUrl2)
      res.SuccessUrl2 = extra?.data?.SuccessUrl2 as Payment["SuccessUrl2"]

    if (extra?.data?.SuccessUrl2Method)
      res.SuccessUrl2Method = extra?.data?.SuccessUrl2Method as Payment["SuccessUrl2Method"]

    if (extra?.data?.FailUrl2)
      res.FailUrl2 = extra?.data?.FailUrl2 as Payment["FailUrl2"]

    if (extra?.data?.FailUrl2Method)
      res.FailUrl2Method = extra?.data?.FailUrl2Method as Payment["FailUrl2Method"]

    if (extra?.data?.EMail)
      res.EMail = extra?.data?.EMail as Payment["EMail"]

    if (extra?.data?.Culture)
      res.Culture = extra?.data?.Culture as Payment["Culture"]

    const isTest =
      extra?.data?.isTest as Payment["isTest"] ??
      (this.options_.isTest ? "1" : undefined)
    if (isTest !== undefined) res.isTest = isTest

    const stepByStep =
      extra?.data?.StepByStep as Payment["StepByStep"] ??
      (this.options_.capture === false ? "true" : undefined)
    if (stepByStep !== undefined) res.StepByStep = stepByStep

    return res
  }

  /**
   * Initiate a new payment.
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    this.logger_.debug(
      `RobokassaBase.initiatePayment input:\n${JSON.stringify(input, null, 2)}`
    )

    const { amount, context = {} } = input

    const outSum = Number(amount).toFixed(2)
    // TODO: can we avoide generating invoice id?
    const invoiceId = stringToNumberHash(context.idempotency_key as string).toString()
    const sessionId = input.data?.session_id as string
    const cart = input.data?.cart as Record<string, any>

    const additionalParameters = this.normalizePaymentParameters(input)

    let receipt = {} as Receipt
    if (this.options_.useReceipt && cart) {
      receipt = generateReceipt(
        this.options_.taxation!,
        this.options_.taxItemDefault!,
        this.options_.taxShippingDefault!,
        input.data?.cart as Record<string, any>
      )
    }

    const receiptJson = JSON.stringify(receipt)
    const receiptEncoded = encodeURIComponent(receiptJson)

    const raw = [
      this.options_.merchantLogin,
      outSum,
      invoiceId,
      ...(this.options_.useReceipt ? [receiptJson] : []),
      ...(additionalParameters.StepByStep ? [additionalParameters.StepByStep] : []),
      additionalParameters.SuccessUrl2,
      additionalParameters.SuccessUrl2Method,
      additionalParameters.FailUrl2,
      additionalParameters.FailUrl2Method,
      this.options_.isTest ? this.options_.testPassword1 : this.options_.password1,
      `Shp_SessionID=${sessionId}`
    ]
    const signature = createSignature(raw, this.options_.hashAlgorithm)

    const payment: Payment = {
      MerchantLogin: this.options_.merchantLogin,
      OutSum: outSum,
      ...(this.options_.useReceipt ? { Receipt: receiptEncoded } : {}),
      InvoiceID: invoiceId,
      SignatureValue: signature,
      Shp_SessionID: sessionId,
      ...additionalParameters
    }

    const params = new URLSearchParams(payment as unknown as Record<string, string>).toString()
    const paymentUrl = `${this.paymentUrl_}?${params}`

    const output = {
      id: invoiceId,
      data: {
        paymentUrl: paymentUrl,
        ...payment
      }
    }
    this.logger_.debug("RobokassaBase.initiatePayment output:\n" + JSON.stringify(output, null, 2))
    return output
  }

  /**
   * Capture an existing payment.
   */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    this.logger_.debug(`RobokassaBase.capturePayment input:\n${JSON.stringify(input, null, 2)}`)

    const invoiceId = input.data?.InvoiceID as string
    const outSum = input.data?.OutSum as string

    const raw = [
      this.options_.merchantLogin,
      outSum,
      invoiceId,
      this.options_.isTest ? this.options_.testPassword1 : this.options_.password1
    ]
    const signature = createSignature(raw, this.options_.hashAlgorithm)

    const capturePayment: Partial<Payment> = {
      MerchantLogin: this.options_.merchantLogin,
      InvoiceID: invoiceId,
      SignatureValue: signature,
      OutSum: outSum
    }
    const params = new URLSearchParams(capturePayment as unknown as Record<string, string>).toString()
    const capturePaymentUrl = `${this.capturePaymentUrl_}?${params}`

    try {
      const response = await axios.post(capturePaymentUrl)

      const output = { data: response.data as unknown as Record<string, unknown> }
      this.logger_.debug("RobokassaBase.capturePayment output:\n" + JSON.stringify(output, null, 2))
      return output
    } catch (e) {
      throw this.buildError("An error occurred in capturePayment", e)
    }
  }

  /**
   * Authorize a payment by retrieving its status.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    this.logger_.debug(`RobokassaBase.authorizePayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = await this.getPaymentStatus(input)
    this.logger_.debug("RobokassaBase.authorizePayment output:\n" + JSON.stringify(output, null, 2))
    return output
  }

  /**
   * Delete a payment.
   * Payment delete is not supported by Robokassa.
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    this.logger_.debug(`RobokassaBase.deletePayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = input
    this.logger_.debug("RobokassaBase.deletePayment output:\n" + JSON.stringify(output, null, 2))
    return output
  }

  /**
   * Update a payment.
   * Payment update is not supported by Robokassa.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    this.logger_.debug(`RobokassaBase.updatePayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = input
    this.logger_.debug("RobokassaBase.updatePayment output:\n" + JSON.stringify(output, null, 2))
    return output
  }

  /**
   * Refund a payment.
   * Payment refund is not supported by Robokassa.
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    this.logger_.debug(`RobokassaBase.refundPayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = input
    this.logger_.debug("RobokassaBase.refundPayment output:\n" + JSON.stringify(output, null, 2))
    return output
  }

  /**
   * Cancel an existing payment.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    this.logger_.debug(`RobokassaBase.cancelPayment input:\n${JSON.stringify(input, null, 2)}`)

    const output = input
    this.logger_.debug("RobokassaBase.cancelPayment output:\n" + JSON.stringify(output, null, 2))
    return output
  }

  /**
   * Retrieve a payment.
   */
  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    this.logger_.debug(`RobokassaBase.retrievePayment input:\n${JSON.stringify(input, null, 2)}`)

    const invoiceId = input.data?.InvoiceID as string
    const raw = [
      this.options_.merchantLogin,
      invoiceId,
      this.options_.isTest ? this.options_.testPassword2 : this.options_.password2
    ]
    const signature = createSignature(raw, this.options_.hashAlgorithm)

    const params = new URLSearchParams({
      MerchantLogin: this.options_.merchantLogin,
      InvoiceID: invoiceId,
      Signature: signature,
    }).toString()

    const url = `${this.getPaymentUrl_}?${params}`

    try {
      const { data: xml } = await axios.post(url)
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      })

      const parsed = parser.parse(xml)
      const response = parsed['OperationStateResponse']

      const output = {
        data: {
          ...input.data,
          response: response
        }
      }
      this.logger_.debug("RobokassaBase.retrievePayment output:\n" + JSON.stringify(output, null, 2))
      return output
    } catch (e) {
      throw this.buildError("An error occurred in retrievePayment", e)
    }
  }

  /**
   * Retrieve payment status and map it to Medusa status.
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    this.logger_.debug(
      `RobokassaBase.getPaymentStatus input:\n${JSON.stringify(input, null, 2)}`
    )
    try {
      const response = (await this.retrievePayment(input)).data?.response as { Result: { Code: string, Description: string }, State: { Code: string } }
      if (!response || !response.Result || !response.State) {
        throw new Error("Invalid response structure from Robokassa")
      }

      const result = response.Result as { Code: string, Description: string }
      const state = response.State as { Code: string }

      const resultCode = parseInt(result.Code, 10)
      const resultDescription = result.Description
      if (resultCode !== 0) {
        throw new Error(`Robokassa error ${resultCode}: ${resultDescription}`)
      }
      const paymentState = parseInt(state.Code, 10)

      const status = PaymentStateCodesMap[paymentState] ?? PaymentSessionStatus.ERROR

      const output = { status, data: { ...input.data, response } }
      this.logger_.debug("RobokassaBase.getPaymentStatus output:\n" + JSON.stringify(output, null, 2))
      return output
    } catch (e) {
      throw this.buildError("An error occurred in getPaymentStatus", e)
    }
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    this.logger_.debug(
      `RobokassaBase.getWebhookActionAndData payload:\n${JSON.stringify(payload, null, 2)}`
    )

    const data = payload.data as unknown as RobokassaEvent
    const isValid = await this.isWebhookEventValid(data)
    if (!isValid)
      return {
        action: PaymentActions.NOT_SUPPORTED
      }

    const sessionId = data.Shp_SessionID
    const outSum = Number(data.OutSum)

    const result = {
      action: PaymentActions.SUCCESSFUL,
      data: { session_id: sessionId, amount: outSum }
    }
    this.logger_.debug("RobokassaBase.getWebhookActionAndData result:\n" + JSON.stringify(result, null, 2))
    return result
  }

  protected async isWebhookEventValid(data: RobokassaEvent): Promise<boolean> {
    const incomingSignature = data.SignatureValue
    const raw = [
      data.OutSum,
      data.InvId,
      this.options_.password2,
      `Shp_SessionID=${data.Shp_SessionID}`
    ]
    const signature = createSignature(raw, this.options_.hashAlgorithm)

    return signature === incomingSignature
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

export default RobokassaBase
