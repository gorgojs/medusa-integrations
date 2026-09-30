"use client"

import type { HttpTypes } from "@medusajs/types"
import { useShippingSelection } from "@modules/checkout/context/shipping-selection-context"
import type { ApishipSelection } from "types/apiship"
import { getApishipSelection } from "./utils"

export function useApishipSelection(
  cart: HttpTypes.StoreCart,
  optionId: string | null | undefined
): ApishipSelection | null {
  const { getOptionData } = useShippingSelection()

  if (!optionId) return null

  return (
    (getOptionData(optionId) as { apishipData?: ApishipSelection } | undefined)
      ?.apishipData ?? getApishipSelection(cart, optionId)
  )
}
