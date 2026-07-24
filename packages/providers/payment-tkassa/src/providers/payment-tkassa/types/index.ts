import { components } from "t-kassa-api/openapi"
import { PaymentSessionStatus } from "@medusajs/framework/utils"

export interface TKassaOptions {
  terminalKey: string
  password: string
  webhookSecret?: string
  capture?: boolean
  // Receipt options
  useReceipt?: boolean
  ffdVersion?: "1.2" | "1.05"
  taxation?: components["schemas"]["Receipt_FFD_105"]["Taxation"] | components["schemas"]["Receipt_FFD_12"]["Taxation"]
  taxItemDefault?: components["schemas"]["Items_FFD_105"]["Tax"] | components["schemas"]["Items_FFD_12"]["Tax"]
  taxShippingDefault?: components["schemas"]["Items_FFD_105"]["Tax"] | components["schemas"]["Items_FFD_12"]["Tax"]
}

export interface PaymentOptions {
}

export interface Payment {
  TerminalKey: string
  Password: string
  Amount: number
  OrderId: string
  SuccessURL?: string
  FailURL?: string
  PayType?: components["schemas"]["Init_FULL"]["PayType"]
}

export interface TkassaEvent extends Partial<Payment> {
  Token: string
  Status: keyof typeof PaymentStatuses
  OrderId: string
  Amount: number
  [k: string]: any
}

export const PaymentProviderKeys = {
  TKASSA: "tkassa",
}

export const PaymentStatuses = {
  NEW: "NEW",
  FORM_SHOWED: "FORM_SHOWED",
  AUTHORIZING: "AUTHORIZING",
  "3DS_CHECKING": "3DS_CHECKING",
  "3DS_CHECKED": "3DS_CHECKED",
  AUTHORIZED: "AUTHORIZED",
  PAY_CHECKING: "PAY_CHECKING",
  CONFIRMING: "CONFIRMING",
  CONFIRMED: "CONFIRMED",
  REVERSING: "REVERSING",
  PARTIAL_REVERSED: "PARTIAL_REVERSED",
  REVERSED: "REVERSED",
  REFUNDING: "REFUNDING",
  PARTIAL_REFUNDED: "PARTIAL_REFUNDED",
  REFUNDED: "REFUNDED",
  CANCELED: "CANCELED",
  DEADLINE_EXPIRED: "DEADLINE_EXPIRED",
  REJECTED: "REJECTED",
  AUTH_FAIL: "AUTH_FAIL",
}

export const PaymentStatusesMap = {
  NEW: PaymentSessionStatus.PENDING,
  FORM_SHOWED: PaymentSessionStatus.PENDING,
  AUTHORIZING: PaymentSessionStatus.PENDING,
  "3DS_CHECKING": PaymentSessionStatus.PENDING,
  "3DS_CHECKED": PaymentSessionStatus.PENDING,
  AUTHORIZED: PaymentSessionStatus.AUTHORIZED,
  PAY_CHECKING: PaymentSessionStatus.PENDING,
  CONFIRMING: PaymentSessionStatus.PENDING,
  CONFIRMED: PaymentSessionStatus.CAPTURED,
  REVERSING: PaymentSessionStatus.CANCELED,
  PARTIAL_REVERSED: PaymentSessionStatus.CANCELED,
  REVERSED: PaymentSessionStatus.CANCELED,
  REFUNDING: PaymentSessionStatus.CANCELED,
  PARTIAL_REFUNDED: PaymentSessionStatus.CANCELED,
  REFUNDED: PaymentSessionStatus.CANCELED,
  CANCELED: PaymentSessionStatus.CANCELED,
  DEADLINE_EXPIRED: PaymentSessionStatus.CANCELED,
  REJECTED: PaymentSessionStatus.ERROR,
  AUTH_FAIL: PaymentSessionStatus.ERROR,
}

export const Taxations: TKassaOptions["taxation"][] = [
  "osn",
  "usn_income",
  "usn_income_outcome",
  "esn",
  "patent"
]

export const TaxItem: TKassaOptions["taxItemDefault"][] = [
  "none",
  "vat0",
  "vat5",
  "vat7",
  "vat10",
  "vat20",
  "vat105",
  "vat107",
  "vat110",
  "vat120"
]

export const TaxShipping: TKassaOptions["taxShippingDefault"][] = [
  "none",
  "vat0",
  "vat5",
  "vat7",
  "vat10",
  "vat20",
  "vat105",
  "vat107",
  "vat110",
  "vat120"
]

export const FfdVersions: TKassaOptions["ffdVersion"][] = [
  "1.2",
  "1.05"
]
