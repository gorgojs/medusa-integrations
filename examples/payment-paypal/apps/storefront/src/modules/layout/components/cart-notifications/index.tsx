import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

// Split out of the (main) layout so the customer / cart / shipping-options
// round trips sit behind a <Suspense> boundary. In the layout body they held
// back every child, including the home page hero that is the LCP element.
export default async function CartNotifications() {
  const [customer, cart] = await Promise.all([
    retrieveCustomer(),
    retrieveCart(),
  ])

  if (!cart) {
    return null
  }

  const { shipping_options: shippingOptions } = await listCartOptions()

  return (
    <>
      {customer && <CartMismatchBanner customer={customer} cart={cart} />}
      <FreeShippingPriceNudge
        variant="popup"
        cart={cart}
        shippingOptions={shippingOptions}
      />
    </>
  )
}
