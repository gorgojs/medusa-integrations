"use client"

import { transferCart } from "@lib/data/customer"
import { ExclamationCircleSolid } from "@medusajs/icons"
import type { StoreCart, StoreCustomer } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useState } from "react"
import { useTranslations } from "next-intl"

function CartMismatchBanner(props: {
  customer: StoreCustomer
  cart: StoreCart
}) {
  const { customer, cart } = props
  const t = useTranslations("CartMismatchBanner")
  const [isPending, setIsPending] = useState(false)
  const [actionText, setActionText] = useState<string | null>(null)

  if (!customer || cart.customer_id) {
    return
  }

  const handleSubmit = async () => {
    try {
      setIsPending(true)
      setActionText(t("transferring"))

      await transferCart()
    } catch {
      setActionText(t("runTransferAgain"))
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center justify-center small:p-4 p-2 text-center bg-orange-300 small:gap-2 gap-1 text-sm mt-2 text-orange-800">
      <div className="flex flex-col small:flex-row small:gap-2 gap-1 items-center">
        <span className="flex items-center gap-1">
          <ExclamationCircleSolid className="inline" />
          {t("errorMessage")}
        </span>

        <span>·</span>

        <Button
          variant="transparent"
          className="hover:bg-transparent active:bg-transparent focus:bg-transparent disabled:text-orange-500 text-orange-950 p-0 bg-transparent"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {actionText ?? t("runTransferAgain")}
        </Button>
      </div>
    </div>
  )
}

export default CartMismatchBanner
