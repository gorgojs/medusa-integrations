import { sdk } from "@lib/config"
import { placeOrder } from "@lib/data/cart"
import { getAuthHeaders, setCartId } from "@lib/data/cookies"
import { isAppLocale, defaultLocale } from "@i18n/config"
import type { HttpTypes } from "@medusajs/types"
import { unstable_rethrow } from "next/navigation"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl

  const cartId = searchParams.get("cart_id")
  const requestedLocale = searchParams.get("locale")
  const paymentIntent = searchParams.get("payment_intent")
  const paymentIntentClientSecret = searchParams.get(
    "payment_intent_client_secret"
  )
  const redirectStatus = searchParams.get("redirect_status")

  // Every route in this storefront is locale-prefixed, so the redirects below
  // carry the locale the customer left the site with.
  const locale = isAppLocale(requestedLocale) ? requestedLocale : defaultLocale
  const rejected = () =>
    NextResponse.redirect(`${origin}/${locale}/cart?error=payment_failed`)

  if (!cartId || !paymentIntent || !paymentIntentClientSecret) {
    return rejected()
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "payment_collection.payment_sessions.data" },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session) => session.data?.id === paymentIntent
  )

  if (
    !paymentSession ||
    paymentSession.data?.client_secret !== paymentIntentClientSecret
  ) {
    return rejected()
  }

  await setCartId(cartId)

  // The customer backed out or the bank declined. Stripe puts the PaymentIntent
  // back into `requires_payment_method`, so the Payment Element can mount
  // against it again — return to the checkout and let them retry.
  if (redirectStatus === "failed") {
    const params = new URLSearchParams()

    // Forward Stripe's own return parameters so the checkout page can tell how
    // the off-site authorization ended.
    for (const key of [
      "payment_intent",
      "payment_intent_client_secret",
      "redirect_status",
    ]) {
      const value = searchParams.get(key)

      if (value) {
        params.set(key, value)
      }
    }

    return NextResponse.redirect(`${origin}/${locale}/checkout?${params}`)
  }

  try {
    await placeOrder(cartId)
  } catch (error) {
    unstable_rethrow(error)

    return NextResponse.redirect(`${origin}/${locale}/cart?error=order_failed`)
  }

  // Only reached when the cart did not convert into an order.
  return NextResponse.redirect(`${origin}/${locale}/cart?error=order_failed`)
}
