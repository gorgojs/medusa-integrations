/** The merchant's settings, resolved from the integration module. */
export type { PayPalOptions } from "../../integration-paypal/services/paypal-integration"

/** A Medusa address as the storefront passes it in the session data. */
export type MedusaAddress = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
}

export type PayPalRefundRecord = {
  id?: string
  status?: string
  amount: string
}

/**
 * What the provider keeps in the Medusa payment session. Medusa merges it with the
 * data the storefront sent (`session_id`, and `express`, `paypal_order_id`,
 * `shipping_address` when given).
 */
export type PayPalSessionData = {
  session_id?: string
  paypal_order_id?: string
  intent?: string
  currency_code?: string
  status?: string
  express?: boolean
  capture_id?: string
  capture_status?: string
  authorization_id?: string
  authorization_status?: string
  refunds?: PayPalRefundRecord[]
  decline?: { code: string; message: string; retryable: boolean }
  shipping_address?: MedusaAddress
}
