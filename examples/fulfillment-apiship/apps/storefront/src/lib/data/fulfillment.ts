"use server"

import { sdk } from "@lib/config"
import type { HttpTypes } from "@medusajs/types"
import type {
  ApishipCalculation,
  ApishipPoint,
  ApishipProvider,
  ApishipRawPoint,
} from "@modules/checkout/components/apiship/types"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export const listCartShippingMethods = async (cartId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreShippingOptionListResponse>(
      `/store/shipping-options`,
      {
        method: "GET",
        query: {
          cart_id: cartId,
          fields: "+metadata",
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ shipping_options }) => shipping_options)
    .catch(() => {
      return null
    })
}

export const calculatePriceForShippingOption = async (
  optionId: string,
  cartId: string,
  data?: Record<string, unknown>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  const body = { cart_id: cartId, data }

  if (data) {
    body.data = data
  }

  return sdk.client
    .fetch<{ shipping_option: HttpTypes.StoreCartShippingOption }>(
      `/store/shipping-options/${optionId}/calculate`,
      {
        method: "POST",
        body,
        headers,
        next,
      }
    )
    .then(({ shipping_option }) => shipping_option)
    .catch((_e) => {
      return null
    })
}

/**
 * Quotes the cart with every carrier ApiShip has a connection for. The answer is split in
 * two, the tariffs that deliver to an address and the tariffs that deliver to a pickup
 * point, and the shipping option's own `deliveryType` decides which half the checkout
 * shows. A group with no carrier key is dropped, since nothing downstream can name it.
 */
export const retrieveApishipCalculation = async (
  cartId: string,
  shippingOptionId: string
): Promise<ApishipCalculation | null> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  return sdk.client
    .fetch<{ calculation: ApishipCalculation }>(
      `/store/apiship/${shippingOptionId}/calculate`,
      {
        method: "POST",
        headers,
        body: { cart_id: cartId },
        next,
      }
    )
    .then(({ calculation }) => ({
      deliveryToDoor: (calculation.deliveryToDoor ?? []).flatMap((group) =>
        group.providerKey
          ? [{ providerKey: group.providerKey, tariffs: group.tariffs }]
          : []
      ),
      deliveryToPoint: (calculation.deliveryToPoint ?? []).flatMap((group) =>
        group.providerKey
          ? [{ providerKey: group.providerKey, tariffs: group.tariffs }]
          : []
      ),
    }))
    .catch((_e) => {
      return null
    })
}

/**
 * Resolves the pickup points the calculation named to addresses, opening hours and
 * photos. The calculation only carries point ids, and the map needs coordinates, so a
 * point without them is dropped rather than drawn at the origin.
 */
export const retrieveApishipPoints = async (
  cartId: string,
  shippingOptionId: string,
  pointIds: Array<number>
): Promise<ApishipPoint[] | null> => {
  if (!pointIds.length) {
    return []
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  const fields = [
    "id",
    "description",
    "providerKey",
    "name",
    "address",
    "photos",
    "worktime",
    "timetable",
    "lat",
    "lng",
  ].join(",")

  return sdk.client
    .fetch<{ points: ApishipRawPoint[] }>(
      `/store/apiship/points`,
      {
        method: "GET",
        headers,
        query: {
          key: `apiship:points:${cartId}:${shippingOptionId}`,
          filter: `id=[${pointIds.join(",")}]`,
          fields,
          shipping_option_id: shippingOptionId,
        },
        next,
      }
    )
    .then(({ points }) =>
      (points ?? []).flatMap((point) => {
        if (
          point.id === undefined ||
          point.id === null ||
          point.lat === undefined ||
          point.lat === null ||
          point.lng === undefined ||
          point.lng === null
        ) {
          return []
        }

        return [{ ...point, id: String(point.id), lat: point.lat, lng: point.lng }]
      })
    )
    .catch((_e) => {
      return null
    })
}

/**
 * The carriers behind the tariffs. A calculation names them by key, and this is what turns
 * `cdek` into the name the customer reads.
 */
export const retrieveApishipProviders = async (shippingOptionId?: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  return sdk.client
    .fetch<{ providers: ApishipProvider[] }>(
      `/store/apiship/providers`,
      {
        method: "GET",
        headers,
        query: {
          shipping_option_id: shippingOptionId,
        },
        next,
      }
    )
    .then(({ providers }) => providers)
    .catch((_e) => {
      return null
    })
}
