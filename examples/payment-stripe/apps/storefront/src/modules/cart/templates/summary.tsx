"use client"

import { Button } from "@medusajs/ui"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import { Link } from "@i18n/navigation"
import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const t = useTranslations("CartSummary")
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-8">
      <CartTotals totals={cart} />
      <DiscountCode cart={cart} />
      <Link href={"/checkout?step=" + step} data-testid="checkout-button">
        <Button className="w-full" size="large">
          {t("goToCheckout")}
        </Button>
      </Link>
    </div>
  )
}

export default Summary
