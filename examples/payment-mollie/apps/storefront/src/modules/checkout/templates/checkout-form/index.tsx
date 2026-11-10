import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listRegions } from "@lib/data/regions"
import { getCountryCode } from "@lib/data/cookies"
import { retrieveCustomerAddresses } from "@lib/data/customer"
import type { HttpTypes } from "@medusajs/types"
import CheckoutShippingSection from "@modules/checkout/components/checkout-shipping-section"
import CheckoutInfoRows from "@modules/checkout/components/checkout-info-rows"
import CheckoutItemList from "@modules/checkout/components/checkout-item-list"
import SignInPrompt from "@modules/checkout/components/sign-in-prompt"
import { Link } from "@i18n/navigation"
import { getTranslations } from "next-intl/server"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) return null

  const [shippingOptions, regions, currentCountry, addresses, t] =
    await Promise.all([
      listCartShippingMethods(cart.id),
      listRegions(),
      getCountryCode(),
      retrieveCustomerAddresses(),
      getTranslations("CheckoutPage"),
    ])

  const resolvedCountry =
    currentCountry ||
    cart.shipping_address?.country_code ||
    cart.region?.countries?.[0]?.iso_2 ||
    ""

  return (
    <div className="flex flex-col px-4 py-6 lg:pe-10 lg:py-10 lg:ps-0 gap-y-6">
      {!customer && <SignInPrompt />}

      <CheckoutShippingSection
        cart={cart}
        availableShippingOptions={shippingOptions}
        regions={regions ?? []}
        currentCountry={resolvedCountry}
      />
      <CheckoutInfoRows
        cart={cart}
        customer={customer}
        addresses={addresses}
        availableShippingMethods={shippingOptions}
      />

      <CheckoutItemList cart={cart} />

      <div className="hidden lg:flex gap-x-4 mt-auto">
        <Link href="/shipping" className="txt-medium text-ui-fg-base hover:text-ui-fg-subtle transition-colors">
          {t("shippingLink")}
        </Link>
        <Link href="/returns" className="txt-medium text-ui-fg-base hover:text-ui-fg-subtle transition-colors">
          {t("returnsLink")}
        </Link>
      </div>
    </div>
  )
}
