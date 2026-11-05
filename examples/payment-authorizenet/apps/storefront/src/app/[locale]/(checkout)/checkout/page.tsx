import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getAuthorizeNetConfig } from "@lib/data/authorizenet"
import { listCartPaymentMethods } from "@lib/data/payment"
import { isAuthorizeNet } from "@lib/constants"
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

  const [customer, paymentMethods, authorizeNetConfig] = await Promise.all([
    retrieveCustomer(),
    listCartPaymentMethods(cart.region?.id ?? ""),
    getAuthorizeNetConfig(),
  ])
  // Accept.js loads only where the cart's region takes Authorize.net
  const regionTakesAuthorizeNet = (paymentMethods ?? []).some((method) =>
    isAuthorizeNet(method.id)
  )

  return (
    <PaymentWrapper
      cart={cart}
      authorizeNetConfig={regionTakesAuthorizeNet ? authorizeNetConfig : null}
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
