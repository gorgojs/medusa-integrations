"use client"

import { useState } from "react"
import { isPickupShippingOption } from "@lib/util/fulfillment"
import CheckoutAddressSheet from "@modules/checkout/components/checkout-address-sheet"
import { useTranslations } from "next-intl"
import { DeliveryRowShell, type DeliveryRowProps } from "../shared"

const ManualDeliveryRow = ({
  cart,
  customer,
  addresses,
  option,
}: DeliveryRowProps) => {
  const t = useTranslations("CheckoutPage")
  const [open, setOpen] = useState(false)

  const isPickup = isPickupShippingOption(option)
  const addr = cart.shipping_address
  const addressText = addr?.address_1
    ? [addr.address_1, addr.city, addr.postal_code].filter(Boolean).join(", ")
    : null

  return (
    <>
      <DeliveryRowShell
        heading={t("addressHeading")}
        onClick={() => setOpen(true)}
        value={addressText}
        hidden={isPickup}
        disabled={isPickup}
        data-testid="checkout-address-row"
      />

      <CheckoutAddressSheet
        open={open}
        onClose={() => setOpen(false)}
        cart={cart}
        customer={customer}
        addresses={addresses}
      />
    </>
  )
}

export default ManualDeliveryRow
