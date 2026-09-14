"use client"

import { useState } from "react"
import { ChevronRight } from "@medusajs/icons"
import MapPin from "@modules/common/icons/map-pin"
import User from "@modules/common/icons/user"
import type { HttpTypes } from "@medusajs/types"
import CheckoutAddressSheet from "@modules/checkout/components/checkout-address-sheet"
import CheckoutContactsSheet from "@modules/checkout/components/checkout-contacts-sheet"
import { isPickupShippingOption } from "@lib/util/fulfillment"
import { useTranslations } from "next-intl"
import { clx } from "@medusajs/ui"

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
  const [addressOpen, setAddressOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)

  const addr = cart.shipping_address
  const meta = cart.metadata as Record<string, string> | null

  const selectedShippingOptionId = cart.shipping_methods?.at(-1)?.shipping_option_id
  const selectedShippingOption = availableShippingMethods?.find(
    (option) => option.id === selectedShippingOptionId
  )
  const isPickup = isPickupShippingOption(selectedShippingOption)

  const hasAddress = !!addr?.address_1
  const addressText = hasAddress
    ? [addr?.address_1, addr?.city, addr?.postal_code]
        .filter(Boolean)
        .join(", ")
    : null

  const buyerFirstName = meta?.contact_first_name || ""
  const buyerLastName = meta?.contact_last_name || ""
  const buyerPhone = meta?.contact_phone || ""
  const buyerName = [buyerFirstName, buyerLastName].filter(Boolean).join(" ")
  const hasContacts = !!(buyerName || cart.email)

  const hasDifferentRecipient = meta?.has_different_recipient === "true"
  const recipientName = [addr?.first_name, addr?.last_name]
    .filter(Boolean)
    .join(" ")
  const recipientPhone = addr?.phone || ""

  return (
    <div className="flex flex-col gap-y-6">
      <div className={clx(
        "h-px bg-ui-border-base w-full",
        isPickup && "hidden"
      )} />

      <button
        onClick={() => !isPickup && setAddressOpen(true)}
        disabled={isPickup}
        className={clx(
          "flex items-center justify-between w-full gap-x-2 py-2 text-start",
          isPickup && "hidden"
        )}
        data-testid="checkout-address-row"
      >
        <div className="flex items-center gap-x-2">
          <span className="flex-shrink-0 text-ui-fg-base">
            <MapPin size={24} />
          </span>
          <div className="flex flex-col">
            <h2 className="h2-docs text-ui-fg-muted">
              {t("addressHeading")}
            </h2>
            {isPickup ? (
              <span className="txt-small text-ui-fg-muted">
                {t("addressNotNeededForPickup")}
              </span>
            ) : (
              addressText && (
                <span className="txt-small text-ui-fg-base">
                  {addressText}
                </span>
              )
            )}
          </div>
        </div>
        {!isPickup && (
          <ChevronRight className="text-ui-fg-base flex-shrink-0 rtl:rotate-180" />
        )}
      </button>

      <div className="h-px bg-ui-border-base w-full" />

      <div className="flex flex-col gap-y-1">
        <button
          onClick={() => setContactsOpen(true)}
          className="flex items-center justify-between w-full gap-x-2 py-2 text-start"
          data-testid="checkout-contacts-row"
        >
          <div className="flex items-center gap-x-2">
            <span className="flex-shrink-0 text-ui-fg-base">
              <User size={24} />
            </span>
            <div className="flex flex-col">
              <h2 className="h2-docs text-ui-fg-muted">
                {t("contactsHeading")}
              </h2>
              {hasContacts && (
                <span className="txt-small text-ui-fg-base flex gap-x-2">
                  {buyerName && <span>{buyerName}</span>}
                  {buyerPhone && (
                    <span className="text-ui-fg-muted">{buyerPhone}</span>
                  )}
                </span>
              )}
              {hasDifferentRecipient && (recipientName || recipientPhone) && (
                <div className="flex items-center gap-x-2 mt-1">
                  <span className="txt-small text-ui-fg-muted">
                    {t("recipientLabel")}
                  </span>
                  {recipientName && (
                    <span className="txt-small text-ui-fg-base">
                      {recipientName}
                    </span>
                  )}
                  {recipientPhone && (
                    <span className="txt-small text-ui-fg-muted">
                      {recipientPhone}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="text-ui-fg-base flex-shrink-0 rtl:rotate-180" />
        </button>
      </div>

      <div className="h-px bg-ui-border-base w-full" />

      <CheckoutAddressSheet
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        cart={cart}
        customer={customer}
        addresses={addresses}
      />

      <CheckoutContactsSheet
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        cart={cart}
      />
    </div>
  )
}
