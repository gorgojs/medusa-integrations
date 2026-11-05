/** The Google Pay block of the storefront settings, as `@google-pay/button-react` takes it. */
export type StoreAuthorizeNetGooglePayConfig = {
  environment: "TEST" | "PRODUCTION"
  /** `gatewayMerchantId` of the tokenization specification: the account's gateway id. */
  gateway_merchant_id: string
  /** The merchant's Google ID, required by the production environment. */
  merchant_id: string | null
}

/** What the storefront needs to run Accept.js and, when enabled, the Google Pay button. */
export type StoreAuthorizeNetConfig = {
  provider_id: string
  environment: "sandbox" | "production"
  /** The API Login ID Accept.js sends in `authData`. Public by design. */
  api_login_id: string
  /** The Public Client Key Accept.js sends in `authData`. Public by design. */
  client_key: string
  /** `null` when Google Pay is off or the gateway id could not be read. */
  google_pay: StoreAuthorizeNetGooglePayConfig | null
}

export type StoreAuthorizeNetConfigResponse = {
  config: StoreAuthorizeNetConfig
}
