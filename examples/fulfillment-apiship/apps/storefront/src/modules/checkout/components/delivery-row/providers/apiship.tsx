"use client"

import { useState } from "react"
import {
  ApishipDeliveryModal,
  ApishipProviderLogo,
  getApishipDeliveryType,
  useApishipProviders,
  useApishipSelection,
} from "@modules/checkout/components/apiship"
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
  const [open, setOpen] = useState(false)

  const selection = useApishipSelection(cart, option?.id)
  const providers = useApishipProviders(option?.id, open || !!selection)

  if (!option) return null

  const toPoint = getApishipDeliveryType(option) === 2
  const providerKey = selection?.point?.providerKey ?? selection?.tariff.providerKey
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
        trailing={
          selection && providerKey ? (
            <ApishipProviderLogo src={providers[providerKey]?.icon} />
          ) : null
        }
        data-testid="checkout-apiship-row"
      />

      <ApishipDeliveryModal
        open={open}
        onClose={() => setOpen(false)}
        cart={cart}
        addresses={addresses}
        option={option}
        providers={providers}
      />
    </>
  )
}

export default ApishipDeliveryRow
