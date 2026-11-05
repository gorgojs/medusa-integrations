import type { Logger } from "@medusajs/framework/types"
import type { AuthorizeNetOptions } from "../providers/payment-authorizenet/types"
import type { StoreAuthorizeNetConfig } from "../types/http"

/** How long a gateway id read from `getMerchantDetails` is reused. */
export const GATEWAY_ID_TTL_MS = 10 * 60 * 1000

const gatewayIdCache = new Map<string, { gatewayId: string; expiresAt: number }>()

/** For tests: forget every cached gateway id. */
export function clearStorefrontConfigCache(): void {
  gatewayIdCache.clear()
}

export type BuildStorefrontConfigInput = {
  providerId: string
  options: AuthorizeNetOptions
  /** Only `getMerchantDetails` is used, and only when Google Pay is on. */
  client: { getMerchantDetails(): Promise<{ gatewayId?: string }> }
  logger: Pick<Logger, "warn">
  /** Current time in milliseconds. For tests. */
  now?: () => number
}

/**
 * The public settings the storefront needs. Only values safe in a browser leave: the transaction
 * key and the signature key never enter the result. The Google Pay gateway id is read from the
 * account and kept in memory for ten minutes; a failed read turns Google Pay off instead of failing
 * the route.
 */
export async function buildStorefrontConfig({
  providerId,
  options,
  client,
  logger,
  now = Date.now,
}: BuildStorefrontConfigInput): Promise<StoreAuthorizeNetConfig> {
  const environment = options.environment ?? "sandbox"
  const config: StoreAuthorizeNetConfig = {
    provider_id: providerId,
    environment,
    api_login_id: options.apiLoginId,
    client_key: options.publicClientKey,
    google_pay: null,
  }
  if (options.googlePay !== true) {
    return config
  }

  const cacheKey = `${environment}:${options.apiLoginId}`
  const cached = gatewayIdCache.get(cacheKey)
  let gatewayId = cached && cached.expiresAt > now() ? cached.gatewayId : undefined

  if (!gatewayId) {
    try {
      gatewayId = (await client.getMerchantDetails()).gatewayId || undefined
    } catch (error) {
      logger.warn(
        `Authorize.net Google Pay is off for "${providerId}": reading the gateway id failed: ${(error as Error)?.message ?? String(error)}`
      )
      return config
    }
    if (!gatewayId) {
      logger.warn(`Authorize.net Google Pay is off for "${providerId}": the account returned no gateway id`)
      return config
    }
    gatewayIdCache.set(cacheKey, { gatewayId, expiresAt: now() + GATEWAY_ID_TTL_MS })
  }

  config.google_pay = {
    environment: environment === "production" ? "PRODUCTION" : "TEST",
    gateway_merchant_id: gatewayId,
    merchant_id: options.googleMerchantId ?? null,
  }
  return config
}
