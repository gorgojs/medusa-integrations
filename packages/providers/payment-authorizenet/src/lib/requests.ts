import type {
  AnetCustomer,
  AnetCustomerAddress,
  AnetNameAndAddress,
  AnetPayment,
  AnetSetting,
  AnetTransactionRequest,
  AnetTransactionType,
  AnetUserField,
} from "../types"

/**
 * Request builders. Every object is assembled key by key in the order of the XSD: the JSON endpoint
 * translates JSON into XML, and the server expects the XML order. The test checks each builder
 * against spec/element-order.json.
 */

/** Field lengths from the API reference. Longer values are cut rather than rejected. */
export const ANET_LIMITS = {
  name: 50,
  company: 50,
  address: 60,
  city: 40,
  state: 40,
  zip: 20,
  country: 60,
  phoneNumber: 25,
  email: 255,
  userFieldValue: 255,
} as const

/** A Medusa cart address, as Query returns it. */
export type CartAddressLike = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
}

function text(value: string | null | undefined, max: number): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

/** Drops keys whose value is undefined, keeping the order of the rest. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

function hasAny(value: object): boolean {
  return Object.keys(value).length > 0
}

/** `shipTo`: a Medusa address as `nameAndAddressType`. Undefined when the address carries nothing. */
export function toAnetShipTo(address: CartAddressLike | null | undefined): AnetNameAndAddress | undefined {
  if (!address) {
    return undefined
  }
  const street = [address.address_1?.trim(), address.address_2?.trim()].filter(Boolean).join(", ")
  const result = compact<AnetNameAndAddress>({
    firstName: text(address.first_name, ANET_LIMITS.name),
    lastName: text(address.last_name, ANET_LIMITS.name),
    company: text(address.company, ANET_LIMITS.company),
    address: text(street, ANET_LIMITS.address),
    city: text(address.city, ANET_LIMITS.city),
    state: text(address.province, ANET_LIMITS.state),
    zip: text(address.postal_code, ANET_LIMITS.zip),
    country: text(address.country_code?.toUpperCase(), ANET_LIMITS.country),
  })
  return hasAny(result) ? result : undefined
}

/** `billTo`: a Medusa address as `customerAddressType`, with the phone. */
export function toAnetBillTo(address: CartAddressLike | null | undefined): AnetCustomerAddress | undefined {
  const base = toAnetShipTo(address)
  const phoneNumber = text(address?.phone, ANET_LIMITS.phoneNumber)
  if (!base && !phoneNumber) {
    return undefined
  }
  return compact<AnetCustomerAddress>({ ...base, phoneNumber })
}

export function toAnetCustomer(email: string | null | undefined): AnetCustomer | undefined {
  const value = text(email, ANET_LIMITS.email)
  return value ? { email: value } : undefined
}

export type TransactionRequestInput = {
  transactionType: AnetTransactionType
  amount?: string
  currencyCode?: string
  payment?: AnetPayment
  refTransId?: string
  customer?: AnetCustomer
  billTo?: AnetCustomerAddress
  shipTo?: AnetNameAndAddress
  settings?: AnetSetting[]
  userFields?: AnetUserField[]
}

/** `transactionRequestType`, with only the elements this package sends, in the XSD's order. */
export function buildTransactionRequest(input: TransactionRequestInput): AnetTransactionRequest {
  return compact<AnetTransactionRequest>({
    transactionType: input.transactionType,
    amount: input.amount,
    currencyCode: input.currencyCode?.toUpperCase(),
    payment: input.payment,
    refTransId: input.refTransId,
    customer: input.customer,
    billTo: input.billTo,
    shipTo: input.shipTo,
    transactionSettings: input.settings?.length ? { setting: input.settings } : undefined,
    userFields: input.userFields?.length
      ? {
          userField: input.userFields.map((field) => ({
            name: field.name,
            value: field.value.slice(0, ANET_LIMITS.userFieldValue),
          })),
        }
      : undefined,
  })
}
