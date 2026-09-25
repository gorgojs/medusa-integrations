"use client"

import { convertToLocale } from "@lib/util/money"
import {
  getApishipSelection,
  getTariffCost,
  getTariffDays,
  type ApishipSelection,
} from "@modules/checkout/components/apiship"
import { useShippingSelection } from "@modules/checkout/context/shipping-selection-context"
import { useLocale, useTranslations } from "next-intl"
import type React from "react"
import { ShippingOptionCardShell, type ShippingOptionCardProps } from "../shared"

/**
 * ApiShip has no price until the customer picks a tariff, so the card shows none. Once a
 * tariff is picked the card carries its delivery dates and exactly the price the cart is
 * charged, and keeps both while the customer looks at another method, since the choice is
 * kept too.
 */
const ApishipShippingOptionCard: React.FC<ShippingOptionCardProps> = ({
  cart,
  option,
  isSelected,
  isUnavailable,
  formatDeliveryDays,
}) => {
  const tCheckout = useTranslations("CheckoutPage")
  const locale = useLocale()
  const { getOptionData } = useShippingSelection()

  const selection =
    (getOptionData(option.id) as { apishipData?: ApishipSelection } | undefined)
      ?.apishipData ?? getApishipSelection(cart, option.id)

  const cost = selection ? getTariffCost(selection.tariff) : null

  const price =
    cost === null
      ? null
      : cost === 0
        ? tCheckout("freeShipping")
        : convertToLocale({
          amount: cost,
          currency_code: cart.currency_code,
          locale,
        })

  const caption = selection
    ? formatDeliveryDays(getTariffDays(selection.tariff))
    : null

  return (
    <ShippingOptionCardShell
      option={option}
      isSelected={isSelected}
      isUnavailable={isUnavailable}
      price={price}
      isLoadingPrice={false}
      isFreeShipping={cost === 0}
      caption={caption}
    />
  )
}

export default ApishipShippingOptionCard
