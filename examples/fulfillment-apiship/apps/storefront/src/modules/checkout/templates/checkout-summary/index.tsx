import { listCartPaymentMethods } from "@lib/data/payment"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import type { HttpTypes } from "@medusajs/types"
import DiscountCode from "@modules/checkout/components/discount-code"
import CheckoutPaymentSection from "@modules/checkout/components/checkout-payment-section"
import CheckoutTotals from "@modules/checkout/components/checkout-totals"

const CheckoutSummary = async ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const [paymentMethods, shippingOptions] = await Promise.all([
    listCartPaymentMethods(cart.region?.id ?? ""),
    listCartShippingMethods(cart.id),
  ])

  return (
    <div className="flex flex-col gap-y-8 px-4 py-4 lg:py-10 lg:ps-10  bg-neutral-100 lg:-me-[9999px] lg:pe-[9999px]">
      <CheckoutTotals cart={cart} />

      <DiscountCode cart={cart} />

      <CheckoutPaymentSection
        cart={cart}
        availablePaymentMethods={paymentMethods ?? []}
        availableShippingOptions={shippingOptions}
      />
    </div>
  )
}

export default CheckoutSummary
