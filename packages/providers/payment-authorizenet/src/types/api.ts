/**
 * The parts of the Authorize.net API this package calls, written from the XSD
 * (https://api.authorize.net/xml/v1/schema/AnetApiSchema.xsd, its sha256 is in spec/SPEC_VERSION.txt).
 *
 * The JSON endpoint is a translation of XML, and the server expects elements in the XSD's order.
 * `src/lib/requests.ts` builds requests in that order, and its test checks them against
 * spec/element-order.json.
 */

export type AnetEnvironment = "sandbox" | "production"

export type AnetResultCode = "Ok" | "Error"

export type AnetMessages = {
  resultCode: AnetResultCode
  message?: { code: string; text: string }[]
}

export type AnetTransactionType =
  | "authOnlyTransaction"
  | "authCaptureTransaction"
  | "priorAuthCaptureTransaction"
  | "refundTransaction"
  | "voidTransaction"

/** Data descriptors of the tokens the storefront may send. */
export const ACCEPT_DATA_DESCRIPTOR = "COMMON.ACCEPT.INAPP.PAYMENT"
export const GOOGLE_PAY_DATA_DESCRIPTOR = "COMMON.GOOGLE.INAPP.PAYMENT"

export type AnetOpaqueData = {
  dataDescriptor: string
  dataValue: string
}

export type AnetCreditCard = {
  cardNumber: string
  expirationDate: string
  cardCode?: string
}

export type AnetPayment = { creditCard: AnetCreditCard } | { opaqueData: AnetOpaqueData }

export type AnetCustomer = {
  type?: "individual" | "business"
  id?: string
  email?: string
}

/** `nameAndAddressType`, used for `shipTo`. */
export type AnetNameAndAddress = {
  firstName?: string
  lastName?: string
  company?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

/** `customerAddressType`, used for `billTo`. */
export type AnetCustomerAddress = AnetNameAndAddress & {
  phoneNumber?: string
}

export type AnetSetting = { settingName: string; settingValue: string }

export type AnetUserField = { name: string; value: string }

export type AnetTransactionRequest = {
  transactionType: AnetTransactionType
  amount?: string
  currencyCode?: string
  payment?: AnetPayment
  refTransId?: string
  customer?: AnetCustomer
  billTo?: AnetCustomerAddress
  shipTo?: AnetNameAndAddress
  transactionSettings?: { setting: AnetSetting[] }
  userFields?: { userField: AnetUserField[] }
}

export type AnetTransactionResponse = {
  /** 1 approved, 2 declined, 3 error, 4 held for review. */
  responseCode?: string
  authCode?: string
  avsResultCode?: string
  cvvResultCode?: string
  transId?: string
  refTransID?: string
  /** Masked, as `XXXX1111`. */
  accountNumber?: string
  accountType?: string
  messages?: { code: string; description: string }[]
  errors?: { errorCode: string; errorText: string }[]
}

export type AnetCreateTransactionResponse = {
  refId?: string
  messages: AnetMessages
  transactionResponse?: AnetTransactionResponse
}

export type AnetTransactionDetails = {
  transId: string
  refTransId?: string
  transactionType?: string
  transactionStatus: string
  responseCode?: number | string
  responseReasonCode?: number | string
  responseReasonDescription?: string
  authCode?: string
  authAmount?: number | string
  settleAmount?: number | string
  FDSFilterAction?: string
  payment?: {
    creditCard?: { cardNumber?: string; expirationDate?: string; cardType?: string }
  }
  batch?: { batchId?: string; settlementTimeUTC?: string; settlementState?: string }
}

export type AnetGetTransactionDetailsResponse = {
  messages: AnetMessages
  transaction?: AnetTransactionDetails
  /** The `refId` the transaction was created with. */
  transrefId?: string
}

export type AnetGetMerchantDetailsResponse = {
  messages: AnetMessages
  isTestMode?: boolean
  merchantName?: string
  gatewayId?: string
  currencies?: unknown
  publicClientKey?: string
}

export type AnetSecurePaymentContainerResponse = {
  messages: AnetMessages
  opaqueData?: AnetOpaqueData & { expirationTimeStamp?: string }
}

/** A webhook as the REST API (`/rest/v1/webhooks`) returns it. */
export type AnetWebhook = {
  webhookId: string
  name?: string
  status: "active" | "inactive" | string
  url: string
  eventTypes: string[]
}
