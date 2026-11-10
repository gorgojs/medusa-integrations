"use client"

import { useState } from "react"
import User from "@modules/common/icons/user"
import type { HttpTypes } from "@medusajs/types"
import CheckoutContactsSheet from "@modules/checkout/components/checkout-contacts-sheet"
import DeliveryRow from "@modules/checkout/components/delivery-row"
import CheckoutInfoRow from "./row"
import { useSelectedShippingOptionId } from "@modules/checkout/context/shipping-selection-context"
import { useTranslations } from "next-intl"

interface CheckoutInfoRowsProps {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  addresses: HttpTypes.StoreCustomerAddress[] | null
  availableShippingMethods: HttpTypes.StoreCartShippingOptionWithServiceZone[] | null
}

export default function CheckoutInfoRows({
  cart,
  customer,
  addresses,
  availableShippingMethods,
}: CheckoutInfoRowsProps) {
  const t = useTranslations("CheckoutPage")
  const [contactsOpen, setContactsOpen] = useState(false)

  const meta = cart.metadata as Record<string, string> | null

  const selectedShippingOptionId = useSelectedShippingOptionId(cart)
  const selectedShippingOption =
    availableShippingMethods?.find(
      (option) => option.id === selectedShippingOptionId
    ) ?? null

  const buyerFirstName = meta?.contact_first_name || ""
  const buyerLastName = meta?.contact_last_name || ""
  const buyerPhone = meta?.contact_phone || ""
  const buyerName = [buyerFirstName, buyerLastName].filter(Boolean).join(" ")
  const hasContacts = !!(buyerName || cart.email)

  return (
    <div className="flex flex-col gap-y-6">
      <DeliveryRow
        cart={cart}
        customer={customer}
        addresses={addresses}
        option={selectedShippingOption}
      />

      <CheckoutInfoRow
        icon={<User size={24} />}
        heading={t("contactsHeading")}
        value={
          hasContacts ? (
            <span className="flex gap-x-2">
              {buyerName && <span>{buyerName}</span>}
              {buyerPhone && (
                <span className="text-ui-fg-muted">{buyerPhone}</span>
              )}
            </span>
          ) : null
        }
        onClick={() => setContactsOpen(true)}
        data-testid="checkout-contacts-row"
      />

      <CheckoutContactsSheet
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        cart={cart}
      />
    </div>
  )
}
