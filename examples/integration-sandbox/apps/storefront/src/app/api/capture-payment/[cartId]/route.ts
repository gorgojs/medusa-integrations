import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import {
  getCacheTag,
  getAuthHeaders,
  removeCartId,
} from "@lib/data/cookies"
import { sdk } from "@lib/config"
import { placeOrder } from "@lib/data/cart"

type Params = Promise<{ cartId: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { cartId } = await params
  const { origin, searchParams } = req.nextUrl

  const countryCode = searchParams.get("country_code") || ""
  const headers = { ...(await getAuthHeaders()) }

  // Retrieve fresh cart values
  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
  const { cart } = await sdk.store.cart.retrieve(
    cartId,
    { fields: "id, order_link.order_id, items.total" },
    headers
  )
  if (!cart) {
    return NextResponse.redirect(`${origin}/${countryCode}`)
  }

  const orderId = (cart as unknown as Record<string, any>).order_link?.order_id
  if (!orderId) {
    await placeOrder(cartId)
    // Fail when payment is not authorized
    return NextResponse.redirect(
      `${origin}/${countryCode}/checkout?step=review&error=payment_failed`
    )
  }

  const orderCacheTag = await getCacheTag("orders")
  revalidateTag(orderCacheTag)
  removeCartId()
  return NextResponse.redirect(
    `${origin}/${countryCode}/order/${orderId}/confirmed`
  )
}
