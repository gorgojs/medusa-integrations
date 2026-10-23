import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getStripeConfig } from "@lib/data/stripe"
import { isStripeLike } from "@lib/constants"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import { CartUpdateProvider } from "@modules/checkout/context/cart-update-context"
import { ShippingSelectionProvider } from "@modules/checkout/context/shipping-selection-context"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.checkout")

  return {
    title: pageTitle(t("title")),
    description: t("description"),
  }
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const [customer, paymentMethods, stripeConfig] = await Promise.all([
    retrieveCustomer(),
    listCartPaymentMethods(cart.region?.id ?? ""),
    getStripeConfig(),
  ])
  // the Elements wrap the checkout only where the cart's region takes Stripe
  const regionTakesStripe = (paymentMethods ?? []).some((method) =>
    isStripeLike(method.id)
  )

  return (
    <PaymentWrapper
      cart={cart}
      stripeConfig={regionTakesStripe ? stripeConfig : null}
    >
      <CartUpdateProvider>
        <ShippingSelectionProvider>
          <div className="overflow-x-hidden">
            <div className="lg:content-container flex flex-col lg:grid lg:grid-cols-[7fr_5fr] min-h-screen">
              <CheckoutForm cart={cart} customer={customer} />
              <CheckoutSummary cart={cart} />
            </div>
          </div>
        </ShippingSelectionProvider>
      </CartUpdateProvider>
    </PaymentWrapper>
  )
}
