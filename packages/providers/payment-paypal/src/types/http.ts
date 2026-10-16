import type { PayPalEnvironment } from "../lib/paypal-client"
import type { PayPalPayer } from "../utils/payer"

/** What the storefront needs to load the PayPal JS SDK. */
export type StorePayPalConfig = {
  provider_id: string
  client_id: string
  environment: PayPalEnvironment
  intent: "capture" | "authorize"
}

export type StorePayPalConfigResponse = {
  config: StorePayPalConfig
}

export type StorePayPalPayerResponse = {
  payer: PayPalPayer
}
