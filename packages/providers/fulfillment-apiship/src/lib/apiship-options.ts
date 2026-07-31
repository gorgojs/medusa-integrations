import { MedusaError } from "@medusajs/framework/utils"
import type {
  ApishipConnectionDTO,
  ApishipOptionsDTO,
  DeepPartial,
  StoredApishipOptions,
} from "../types/apiship"

/**
 * VAT rates ApiShip accepts, as descriptor enum values. The integration module's `enum`
 * option is string-only, so they are declared (and stored) as strings and converted back to
 * the numeric `CostDeliveryCostVatEnum` by {@link assembleApishipOptions}.
 */
export const APISHIP_VAT_RATES = ["-1", "0", "5", "7", "10", "20", "22"] as const
export type ApishipVatRate = (typeof APISHIP_VAT_RATES)[number]

/**
 * The defaults, in one place — referenced by the descriptor's `default:` fields (so the
 * integration module applies them at resolve time and the admin renders them) and by
 * {@link assembleApishipOptions} (so an admin read of a not-yet-validated draft shows the same
 * values). Nothing else may hardcode them.
 */
export const APISHIP_DEFAULTS = {
  is_cod: false,
  delivery_cost_vat: "-1",
  /** cm */
  default_product_length: 10,
  default_product_width: 10,
  default_product_height: 10,
  /** grams */
  default_product_weight: 20,
} as const satisfies Partial<Record<keyof StoredApishipOptions, unknown>>

function toVatRate(value: unknown): ApishipOptionsDTO["delivery_cost_vat"] {
  const n = Number(value ?? APISHIP_DEFAULTS.delivery_cost_vat)
  return (Number.isFinite(n) ? n : -1) as ApishipOptionsDTO["delivery_cost_vat"]
}

/**
 * Drop connections that are missing a field the order/calculator mapping relies on. `name`
 * is intentionally NOT required — it is optional on create, and dropping nameless
 * connections here would silently break fulfillment for them.
 */
function normalizeConnections(
  connections: DeepPartial<ApishipConnectionDTO>[] | undefined
): ApishipConnectionDTO[] {
  return (connections ?? []).flatMap((connection) => {
    if (
      !connection?.id ||
      !connection.provider_key ||
      !connection.provider_connect_id ||
      connection.is_enabled === undefined
    ) {
      return []
    }

    return [
      {
        id: connection.id,
        name: connection.name,
        provider_key: connection.provider_key,
        provider_connect_id: connection.provider_connect_id,
        point_in_id: connection.point_in_id,
        point_in_address: connection.point_in_address,
        is_enabled: connection.is_enabled,
      },
    ]
  })
}

/**
 * Assemble the stored row into a complete `ApishipOptionsDTO`: lift the connection list out
 * of the `settings` blob, coerce the VAT rate from its stored string, and fill anything the
 * caller didn't get from the resolver.
 *
 * Runtime reads come through `resolveIntegrationOptions`, where the descriptor's schema has
 * already applied {@link APISHIP_DEFAULTS}; the `??` here covers admin reads of a draft that
 * hasn't been validated yet. Never throws — a missing token yields `""` so the admin can read
 * a half-configured draft; runtime callers gate on {@link assertApishipToken}.
 */
export function assembleApishipOptions(
  options?: StoredApishipOptions | null
): ApishipOptionsDTO {
  return {
    token: options?.token ?? "",
    is_test: options?.is_test ?? false,
    is_cod: options?.is_cod ?? APISHIP_DEFAULTS.is_cod,
    delivery_cost_vat: toVatRate(options?.delivery_cost_vat),
    default_product_length:
      options?.default_product_length ?? APISHIP_DEFAULTS.default_product_length,
    default_product_width:
      options?.default_product_width ?? APISHIP_DEFAULTS.default_product_width,
    default_product_height:
      options?.default_product_height ?? APISHIP_DEFAULTS.default_product_height,
    default_product_weight:
      options?.default_product_weight ?? APISHIP_DEFAULTS.default_product_weight,
    sender_country_code: options?.sender_country_code ?? "",
    sender_address_string: options?.sender_address_string ?? "",
    sender_contact_name: options?.sender_contact_name ?? "",
    sender_phone: options?.sender_phone ?? "",
    connections: normalizeConnections(options?.settings?.connections),
  }
}

/** Guard for every call that is about to talk to ApiShip with these options. */
export function assertApishipToken(options: Pick<ApishipOptionsDTO, "token">): void {
  if (!options.token?.trim()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "ApiShip token is missing — configure the ApiShip integration before using it."
    )
  }
}
