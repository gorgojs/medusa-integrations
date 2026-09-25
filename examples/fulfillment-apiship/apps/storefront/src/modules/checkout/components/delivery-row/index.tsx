"use client"

import { useState } from "react"
import { isPickupShippingOption } from "@lib/util/fulfillment"
import CheckoutAddressSheet from "@modules/checkout/components/checkout-address-sheet"
import { useTranslations } from "next-intl"
import type React from "react"
import { DeliveryRowShell, type DeliveryRowProps } from "./shared"

/**
 * The plain address row, used by every method that ships to the address the customer
 * enters. Medusa's own pickup fulfillment sets need no address at all, so the row steps
 * aside for them.
 */
const AddressDeliveryRow: React.FC<DeliveryRowProps> = ({
  cart,
  customer,
  addresses,
  option,
}) => {
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

/**
 * Picks the row that collects what the selected shipping method needs. A provider whose
 * method asks for something other than an address takes a file under `providers/`,
 * written against the `DeliveryRowProps` of `shared.tsx`, and a case below.
 */
const DeliveryRow: React.FC<DeliveryRowProps> = (props) => {
  switch (true) {
    default:
      return <AddressDeliveryRow {...props} />
  }
}

export default DeliveryRow
