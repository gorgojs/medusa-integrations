import {
  IWebHookEvent,
  Payment,
  Refund,
  ICreatePayment
} from "@a2seven/yoo-checkout"

export interface YookassaOptions {
  /**
   * The SHOP_ID of YooKassa
   */
  shopId: string,
  /**
   * The secret key of YooKassa
   */
  secretKey: string,
  /**
   * Use this flag to capture payment immediately (default is false)
   */
  capture?: boolean,
  /**
   * Set a default description on the payment if the context does not provide one
   */
  paymentDescription?: string,
  /* Receipt options */
  /**
   * Enable receipt generation according to Russian fiscal data format
   */
  useReceipt?: boolean,
  /**
   * Enable when Atol Online FFD 1.2 sales register is used
   */
  useAtolOnlineFFD120?: boolean,
  /**
   * Store tax system
   */
  taxSystemCode?: TaxSystemCode,
  /**
   * Default VAT rate for products
   */
  taxItemDefault?: VatCode,
  /**
   * Default VAT rate for shipping
   */
  taxShippingDefault?: VatCode,
}

export interface PaymentOptions extends Partial<ICreatePayment> { }

export interface YookassaEvent {
  type: "notification",
  event: IWebHookEvent,
  object: Payment | Refund | object
}

export const PaymentProviderKeys = {
  YOOKASSA: "yookassa",
}

export const vatCodes = [
  1, // No VAT
  2, // 0%
  3, // 10%
  4, // 20%
  5, // 10/110
  6, // 20/120
  7, // 5%
  8, // 7%
  9, // 5/105
  10, // 7/107
] as const

export type VatCode = (typeof vatCodes)[number]

export const taxSystemCodes = [
  1, // General taxation system
  2, // Simplified (income)
  3, // Simplified (income minus expenses)
  4, // Single tax on imputed income
  5, // Single agricultural tax
  6 // Patent taxation system
] as const

export type TaxSystemCode = (typeof taxSystemCodes)[number]
