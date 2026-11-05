"use server"

import { sdk } from "@lib/config"

/** What the storefront needs to run Accept.js and the Google Pay button, from `GET /store/authorizenet/config`. */
export type AuthorizeNetConfig = {
  provider_id: string
  environment: "sandbox" | "production"
  /** Accept.js sends the API Login ID and the Public Client Key in `authData`. Both are public by design. */
  api_login_id: string
  client_key: string
  /** `null` while Google Pay is off in the Admin. */
  google_pay: {
    environment: "TEST" | "PRODUCTION"
    gateway_merchant_id: string
    merchant_id: string | null
  } | null
}

/**
 * The public Authorize.net settings of the only Authorize.net integration, or null while it is not
 * configured. They change only in the Admin, so the answer is cached for a minute.
 */
export async function getAuthorizeNetConfig(): Promise<AuthorizeNetConfig | null> {
  return sdk.client
    .fetch<{ config: AuthorizeNetConfig }>("/store/authorizenet/config", {
      method: "GET",
      next: { revalidate: 60 },
    })
    .then(({ config }) => config)
    .catch(() => null)
}
