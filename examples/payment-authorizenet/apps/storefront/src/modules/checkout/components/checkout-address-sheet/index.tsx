"use client"

import { useRouter } from "next/navigation"
import type { HttpTypes } from "@medusajs/types"
import { CheckoutModal } from "@modules/checkout/components/checkout-modal"
import { useTranslations } from "next-intl"
import CheckoutAddressForm from "./address-form"

interface CheckoutAddressSheetProps {
  open: boolean
  onClose: () => void
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  addresses: HttpTypes.StoreCustomerAddress[] | null
}

export default function CheckoutAddressSheet({
  open,
  onClose,
  cart,
  addresses,
}: CheckoutAddressSheetProps) {
  const t = useTranslations("CheckoutPage")
  const router = useRouter()

  return (
    <CheckoutModal open={open} onClose={onClose} title={t("addressModalTitle")}>
      <CheckoutAddressForm
        cart={cart}
        addresses={addresses}
        onClose={onClose}
        onSaved={() => {
          onClose()
          router.refresh()
        }}
      />
    </CheckoutModal>
  )
}
