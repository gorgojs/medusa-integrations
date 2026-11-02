import { randomUUID } from "node:crypto"
import axios from "axios"

export const apiUrl = "https://api.yookassa.ru/v3"

export enum PaymentStatuses {
  waiting_for_capture = "waiting_for_capture",
  pending = "pending",
  succeeded = "succeeded",
  canceled = "canceled",
}

export enum ReceiptStatuses {
  pending = "pending",
  succeeded = "succeeded",
  canceled = "canceled",
}

export enum RefundStatuses {
  canceled = "canceled",
  succeeded = "succeeded",
}

export enum WebHookEvents {
  "payment.waiting_for_capture" = "payment.waiting_for_capture",
  "payment.succeeded" = "payment.succeeded",
  "payment.canceled" = "payment.canceled",
  "refund.succeeded" = "refund.succeeded",
}

export type IPaymentStatus = keyof typeof PaymentStatuses
export type IReceiptStatus = keyof typeof ReceiptStatuses
export type IRefundStatus = keyof typeof RefundStatuses
export type IWebHookEvent = keyof typeof WebHookEvents

export interface IYooCheckoutOptions {
  shopId: string
  secretKey: string
}

export interface IAmount {
  value: string
  currency: string
}

export type IPaymentSubject =
  | "commodity"
  | "excise"
  | "job"
  | "service"
  | "gambling_bet"
  | "gambling_prize"
  | "lottery"
  | "lottery_prize"
  | "intellectual_activity"
  | "payment"
  | "agent_commission"
  | "property_right"
  | "non_operating_gain"
  | "insurance_premium"
  | "sales_tax"
  | "resort_fee"
  | "composite"
  | "another"

export type IPaymentMode =
  | "full_prepayment"
  | "partial_prepayment"
  | "advance"
  | "full_payment"
  | "partial_payment"
  | "credit"
  | "credit_payment"

export type IAgentType =
  | "banking_payment_agent"
  | "banking_payment_subagent"
  | "payment_agent"
  | "payment_subagent"
  | "attorney"
  | "commissioner"
  | "agent"

export type IPaymentMethodType =
  | "bank_card"
  | "apple_pay"
  | "google_pay"
  | "yoo_money"
  | "qiwi"
  | "webmoney"
  | "sberbank"
  | "alfabank"
  | "tinkoff_bank"
  | "b2b_sberbank"
  | "sbp"
  | "mobile_balance"
  | "cash"
  | "installments"

export type IVatDataType = "untaxed" | "calculated" | "mixed"

export type IConfirmationType = "embedded" | "external" | "qr" | "redirect"

export interface ICheckoutCustomer {
  full_name?: string
  inn?: string
  email?: string
  phone?: string
}

export interface IItem {
  description: string
  quantity: string
  amount: IAmount
  vat_code: number
  payment_subject?: IPaymentSubject
  payment_mode?: IPaymentMode
  product_code?: string
  country_of_origin_code?: string
  customs_declaration_number?: string
  excise?: string
  supplier?: {
    name?: string
    phone?: string
    inn?: string
  }
  agent_type?: IAgentType
}

export type IItemWithoutData = Omit<IItem, "supplier" | "agent_type">

export interface IReceipt {
  customer?: ICheckoutCustomer
  items: IItemWithoutData[]
  tax_system_code?: number
  phone?: string
  email?: string
}

export interface IVatData {
  type: IVatDataType
  amount?: IAmount
  rate?: string
}

export interface IPaymentMethodData {
  type: IPaymentMethodType
  login?: string
  phone?: string
  payment_purpose?: string
  vat_data?: IVatData
  card?: {
    number: string
    expiry_month: string
    expiry_year: string
    cardholder: string
    csc: string
  }
  payment_data?: string
  payment_method_token?: string
}

export interface IConfirmation {
  type: IConfirmationType
  locale?: string
  confirmation_token?: string
  confirmation_data?: string
  confirmation_url?: string
  enforce?: boolean
  return_url?: string
}

export type IConfirmationWithoutData = Omit<
  IConfirmation,
  "confirmation_token" | "confirmation_data" | "confirmation_url"
>

export interface IRecipient {
  account_id?: string
  gateway_id: string
}

export type IRecipientWithoutId = Omit<IRecipient, "account_id">

export interface IPassenger {
  first_name: string
  last_name: string
}

export interface IPaymentLeg {
  departure_airport: string
  destination_airport: string
  departure_date: string
  carrier_code?: string
}

export interface IAirline {
  account_id?: string
  ticket_number?: string
  booking_reference?: string
  passengers?: IPassenger[]
  legs?: IPaymentLeg[]
}

export type IAirlineWithoutId = Omit<IAirline, "account_id">

export interface ITransfer {
  account_id: string
  amount: IAmount
  status?: IPaymentStatus
  platform_fee_amount: IAmount
}

export type ITransferWithoutStatus = Omit<ITransfer, "status">

export interface ISource {
  account_id: string
  amount: IAmount
  platform_fee_amount: IAmount
}

export interface ICreatePayment {
  amount: IAmount
  description?: string
  receipt?: IReceipt
  recipient?: IRecipientWithoutId
  payment_token?: string
  payment_method_id?: string
  payment_method_data?: IPaymentMethodData
  confirmation?: IConfirmationWithoutData
  save_payment_method?: boolean
  capture?: boolean
  client_ip?: string
  metadata?: any
  airline?: IAirlineWithoutId
  transfers?: ITransferWithoutStatus[]
  merchant_customer_id?: string
}

export interface ICapturePayment {
  amount?: IAmount
  airline?: IAirlineWithoutId
  transfers?: ITransferWithoutStatus[]
  receipt?: IReceipt
}

export interface ICreateRefund {
  payment_id: string
  amount: IAmount
  description?: string
  receipt?: IReceipt
  sources?: ISource[]
}

export interface IDateFilter {
  value: string
  mode: "gte" | "gt" | "lte" | "lt"
}

export interface IGetPaymentList {
  created_at?: IDateFilter
  captured_at?: IDateFilter
  payment_method?: IPaymentMethodType
  status?: IPaymentStatus
  limit?: number
  cursor?: string
}

export interface IBaseList {
  type: "list"
  next_cursor: string
}

export class Payment {
  declare id: string
  declare status: IPaymentStatus
  declare paid: boolean
  declare amount: IAmount
  declare income_amount: IAmount
  declare refunded_amount: IAmount
  declare created_at: string
  declare description: string
  declare expires_at: string
  declare captured_at: string
  declare metadata: any
  declare payment_token: string
  declare payment_method_id: string
  declare payment_method_data: IPaymentMethodData
  declare payment_method: {
    type: IPaymentMethodType
    id: string
    saved: boolean
    card?: {
      first6: string
      last4: string
      expiry_month: string
      expiry_year: string
      card_type: string
      issuer_country?: string
      issuer_name?: string
      source?: string
    }
    title?: string
    login?: string
    payer_bank_details?: {
      full_name: string
      short_name: string
      address: string
      inn: string
      kpp: string
      bank_name: string
      bank_branch: string
      bank_bik: string
      account: string
    }
    payment_purpose?: string
    vat_data?: IVatData
    phone?: string
    account_number?: string
  }
  declare recipient: IRecipient
  declare confirmation: IConfirmation
  declare save_payment_method: boolean
  declare capture: boolean
  declare client_ip: string
  declare airline: IAirline
  declare refundable: boolean
  declare test: boolean
  declare receipt_registration: IReceiptStatus
  declare cancellation_details: {
    party: string
    reason: string
  }
  declare authorization_details: {
    auth_code: string
    rrn: string
  }
  declare transfers: ITransfer[]
  declare receipt: IReceipt
  declare merchant_customer_id?: string
}

export const paymentFactory = (payload: unknown): Payment =>
  Object.assign(new Payment(), payload)

export class Refund {
  declare id: string
  declare payment_id: string
  declare status: IRefundStatus
  declare created_at: string
  declare amount: IAmount
  declare description: string
  declare sources: ISource[]
  declare receipt?: IReceipt
}

export const refundFactory = (payload: unknown): Refund =>
  Object.assign(new Refund(), payload)

export interface IPaymentList extends IBaseList {
  items: Payment[]
}

export class ErrorResponse {}

export const errorFactory = (payload: unknown): ErrorResponse =>
  Object.assign(
    new ErrorResponse(),
    payload,
    axios.isAxiosError(payload) ? { isAxiosError: true } : {}
  )

const http = axios.create()

export class YooCheckout {
  readonly shopId: string
  readonly secretKey: string
  readonly root: string

  constructor(options: IYooCheckoutOptions) {
    this.shopId = options.shopId
    this.secretKey = options.secretKey
    this.root = apiUrl
  }

  private authData() {
    return {
      username: this.shopId,
      password: this.secretKey,
    }
  }

  private buildQuery(filters: Record<string, unknown>): string {
    const entries = Object.entries(filters)
    const queryString = entries.reduce((sum, [param, value], index) => {
      const separator = index < entries.length - 1 ? "&" : ""
      const filter = value as Partial<IDateFilter> | null | undefined
      return filter?.value && filter?.mode
        ? `${sum}${param}.${filter.mode}=${filter.value}${separator}`
        : `${sum}${param}=${value}${separator}`
    }, "?")
    return queryString === "?" ? "" : queryString
  }

  async createPayment(
    payload: ICreatePayment,
    idempotenceKey: string = randomUUID()
  ): Promise<Payment> {
    try {
      const options = { auth: this.authData(), headers: { "Idempotence-Key": idempotenceKey } }
      const { data } = await http.post(`${this.root}/payments`, payload, options)
      return paymentFactory(data)
    } catch (error) {
      throw errorFactory(error)
    }
  }

  async getPayment(paymentId: string): Promise<Payment> {
    try {
      const options = { auth: this.authData() }
      const { data } = await http.get(`${this.root}/payments/${paymentId}`, options)
      return paymentFactory(data)
    } catch (error) {
      throw errorFactory(error)
    }
  }

  async capturePayment(
    paymentId: string,
    payload: ICapturePayment,
    idempotenceKey: string = randomUUID()
  ): Promise<Payment> {
    try {
      const options = { auth: this.authData(), headers: { "Idempotence-Key": idempotenceKey } }
      const { data } = await http.post(`${this.root}/payments/${paymentId}/capture`, payload, options)
      return paymentFactory(data)
    } catch (error) {
      throw errorFactory(error)
    }
  }

  async cancelPayment(paymentId: string, idempotenceKey: string = randomUUID()): Promise<Payment> {
    try {
      const options = { auth: this.authData(), headers: { "Idempotence-Key": idempotenceKey } }
      const { data } = await http.post(`${this.root}/payments/${paymentId}/cancel`, {}, options)
      return paymentFactory(data)
    } catch (error) {
      throw errorFactory(error)
    }
  }

  async getPaymentList(filters: IGetPaymentList = {}): Promise<IPaymentList> {
    try {
      const options = { auth: this.authData() }
      const { data } = await http.get<IPaymentList>(
        `${this.root}/payments${this.buildQuery({ ...filters })}`,
        options
      )
      data.items = data.items.map((item) => paymentFactory(item))
      return data
    } catch (error) {
      throw errorFactory(error)
    }
  }

  async createRefund(payload: ICreateRefund, idempotenceKey: string = randomUUID()): Promise<Refund> {
    try {
      const options = { auth: this.authData(), headers: { "Idempotence-Key": idempotenceKey } }
      const { data } = await http.post(`${this.root}/refunds`, payload, options)
      return refundFactory(data)
    } catch (error) {
      throw errorFactory(error)
    }
  }

  async getRefund(refundId: string): Promise<Refund> {
    try {
      const options = { auth: this.authData() }
      const { data } = await http.get(`${this.root}/refunds/${refundId}`, options)
      return refundFactory(data)
    } catch (error) {
      throw errorFactory(error)
    }
  }
}
