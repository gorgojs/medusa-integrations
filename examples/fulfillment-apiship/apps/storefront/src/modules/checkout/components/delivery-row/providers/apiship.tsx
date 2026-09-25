"use client"

import { useState } from "react"
import {
  ApishipDeliveryModal,
  getApishipDeliveryType,
  getApishipSelection,
  type ApishipSelection,
} from "@modules/checkout/components/apiship"
import { useShippingSelection } from "@modules/checkout/context/shipping-selection-context"
import { useTranslations } from "next-intl"
import type React from "react"
import { DeliveryRowShell, type DeliveryRowProps } from "../shared"

/**
 * The row an ApiShip method collects its choice through. Delivery to a pickup point asks
 * for the point rather than an address, so the row says so and carries the point under
 * the heading; courier delivery keeps the address. Either way the row opens the same
 * two-step sheet, address first and the carrier's offer second.
 */
const ApishipDeliveryRow: React.FC<DeliveryRowProps> = ({
  cart,
  addresses,
  option,
}) => {
  const t = useTranslations("Apiship")
  const tCheckout = useTranslations("CheckoutPage")
  const { getOptionData } = useShippingSelection()
  const [open, setOpen] = useState(false)

  if (!option) return null

  const toPoint = getApishipDeliveryType(option) === 2
  const selection =
    (getOptionData(option.id) as { apishipData?: ApishipSelection } | undefined)
      ?.apishipData ?? getApishipSelection(cart, option.id)
  const addr = cart.shipping_address

  const addressText = addr?.address_1
    ? [addr.address_1, addr.city, addr.postal_code].filter(Boolean).join(", ")
    : null

  return (
    <>
      <DeliveryRowShell
        heading={toPoint ? t("pickupPointHeading") : tCheckout("addressHeading")}
        onClick={() => setOpen(true)}
        value={!selection ? null : toPoint ? selection.point?.address : addressText}
        data-testid="checkout-apiship-row"
      />

      <ApishipDeliveryModal
        open={open}
        onClose={() => setOpen(false)}
        cart={cart}
        addresses={addresses}
        option={option}
      />
    </>
  )
}

export default ApishipDeliveryRow
