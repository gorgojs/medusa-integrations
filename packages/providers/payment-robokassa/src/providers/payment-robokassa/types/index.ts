export interface RobokassaOptions {
  merchantLogin: string
  hashAlgorithm: string
  password1: string
  password2: string
  testPassword1?: string
  testPassword2?: string
  capture?: boolean,
  isTest?: boolean,
  // Receipt options
  useReceipt?: boolean,
  taxation?: Taxation,
  taxItemDefault?: Tax,
  taxShippingDefault?: Tax,
}

export interface PaymentOptions {
}

export interface Payment {
  MerchantLogin: string
  OutSum: string
  InvoiceID: string
  Receipt?: string
  SuccessUrl2?: string
  SuccessUrl2Method?: "GET" | "POST"
  FailUrl2?: string
  FailUrl2Method?: "GET" | "POST"
  EMail?: string
  SignatureValue: string
  Shp_SessionID: string
  isTest?: "1"
  StepByStep?: "true"
  Culture?: "ru" | "en"
}

export interface RobokassaEvent {
  out_summ: string
  OutSum: string
  inv_id: string
  InvId: string
  crc: string
  SignatureValue: string
  PaymentMethod: string
  IncSum: string
  IncCurrLabel: string
  EMAil: string
  Fee: string
  Shp_SessionID: string
}

export const PaymentProviderKeys = {
  ROBOKASSA: "robokassa",
}

export const HashAlgorithms = [
  'md5',
  'ripemd160',
  'sha1',
  'sha256',
  'sha384',
  'sha512'
]

export const taxations = [
  'osn',
  'usn_income',
  'usn_income_outcome',
  'esn',
  'patent'
] as const
export type Taxation = (typeof taxations)[number]

export const paymentMethods = [
  'full_prepayment',
  'prepayment',
  'advance',
  'full_payment',
  'partial_payment',
  'credit',
  'credit_payment'
] as const
export type PaymentMethod = (typeof paymentMethods)[number]

export const taxes = [
  'none',
  'vat0',
  'vat10',
  'vat110',
  'vat20',
  'vat120',
  'vat5',
  'vat7',
  'vat105',
  'vat107'
] as const
export type Tax = (typeof taxes)[number]

export const paymentObjects = [
  "commodity",
  "excise",
  "job",
  "service",
  "gambling_bet",
  "gambling_prize",
  "lottery",
  "lottery_prize",
  "intellectual_activity",
  "payment",
  "agent_commission",
  "composite",
  "resort_fee",
  "another",
  "property_right",
  "non-operating_gain",
  "insurance_premium",
  "sales_tax"
] as const
export type PaymentObject = (typeof paymentObjects)[number]

export type ReceiptItem = {
  name: string
  quantity: number
  sum: number
  cost?: number
  payment_method?: PaymentMethod
  payment_object?: PaymentObject
  tax: Tax
  nomenclature_code?: string
}

export type Receipt = {
  sno?: Taxation,
  items: ReceiptItem[]
}
