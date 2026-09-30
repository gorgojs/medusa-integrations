"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import type {
  ApishipCalculation,
  ApishipDeliveryChoice,
  ApishipPoint,
  ApishipProvider,
  ApishipRawPoint,
} from "types/apiship"
import { revalidateTag } from "next/cache"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
} from "./cookies"

const toCarrierGroups = <T extends { providerKey?: string; tariffs?: unknown }>(
  groups: T[] | undefined
) =>
  (groups ?? []).flatMap((group) =>
    group.providerKey ? [{ ...group, providerKey: group.providerKey }] : []
  )

const toDrawablePoints = (points: ApishipRawPoint[] | undefined) =>
  (points ?? []).flatMap((point): ApishipPoint[] => {
    if (
      point.id === undefined ||
      point.id === null ||
      typeof point.lat !== "number" ||
      typeof point.lng !== "number"
    ) {
      return []
    }

    return [{ ...point, id: String(point.id), lat: point.lat, lng: point.lng }]
  })

export const retrieveApishipDeliveryChoice = async (
  cartId: string,
  shippingOptionId: string,
  includePoints: boolean
): Promise<ApishipDeliveryChoice | null> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ calculation: ApishipCalculation; points?: ApishipRawPoint[] }>(
      `/store/apiship/${shippingOptionId}/calculate`,
      {
        method: "POST",
        headers,
        body: { cart_id: cartId, include_points: includePoints },
      }
    )
    .then(({ calculation, points }) => ({
      calculation: {
        deliveryToDoor: toCarrierGroups(calculation.deliveryToDoor),
        deliveryToPoint: toCarrierGroups(calculation.deliveryToPoint),
      },
      points: toDrawablePoints(points),
    }))
    .catch((e) => {
      console.error("ApiShip delivery choice failed to load", e)
      return null
    })
}

/**
 * The carriers behind the tariffs. A calculation names them by key, and this is what turns
 * `cdek` into the name the customer reads.
 */
export const retrieveApishipProviders = async (shippingOptionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  return sdk.client
    .fetch<{ providers: ApishipProvider[] }>(`/store/apiship/providers`, {
      method: "GET",
      headers,
      query: {
        shipping_option_id: shippingOptionId,
      },
      next,
    })
    .then(({ providers }) => providers)
    .catch((e) => {
      console.error("ApiShip carriers failed to load", e)
      return null
    })
}

/**
 * Drops the shipping method from the cart, through the route the ApiShip plugin adds for
 * it. Setting a method again keeps the `data` stored on it, so a tariff and a pickup point
 * chosen for another address would survive a plain replace.
 */
export async function removeApishipShippingMethod(shippingMethodId: string) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ id: string; object: string; deleted: boolean }>(
      `/store/carts/${cartId}/shipping-methods/${shippingMethodId}`,
      {
        method: "DELETE",
        headers,
      }
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}
