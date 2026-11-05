"use client"

import type { HttpTypes } from "@medusajs/types"
import { createContext, useCallback, useContext, useState } from "react"

type ShippingSelectionContextValue = {
  /**
   * The option the customer picked but the cart has not taken yet. A calculated provider
   * cannot price the cart until the customer gives it more, an address or a pickup point,
   * and Medusa refuses a shipping method without a price, so the choice lives here until
   * the provider has what it needs.
   */
  pendingOptionId: string | null
  setPendingOptionId: (id: string | null) => void
  /**
   * What a provider collected for one option, kept for the length of the checkout. The
   * cart holds it too, on the shipping method, but switching to another method replaces
   * that method and takes the data with it. Keeping a copy here means a customer who
   * looks at another carrier and comes back finds their choice still made.
   */
  getOptionData: (optionId: string) => Record<string, unknown> | undefined
  setOptionData: (optionId: string, data: Record<string, unknown>) => void
  /** Forgets every collected choice, for when what they were based on has changed. */
  clearOptionData: () => void
}

const ShippingSelectionContext = createContext<ShippingSelectionContextValue>({
  pendingOptionId: null,
  setPendingOptionId: () => {},
  getOptionData: () => undefined,
  setOptionData: () => {},
  clearOptionData: () => {},
})

export function ShippingSelectionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null)
  const [optionData, setAllOptionData] = useState<
    Record<string, Record<string, unknown>>
  >({})

  const getOptionData = useCallback(
    (optionId: string) => optionData[optionId],
    [optionData]
  )

  const setOptionData = useCallback(
    (optionId: string, data: Record<string, unknown>) =>
      setAllOptionData((prev) => ({ ...prev, [optionId]: data })),
    []
  )

  const clearOptionData = useCallback(() => setAllOptionData({}), [])

  return (
    <ShippingSelectionContext.Provider
      value={{
        pendingOptionId,
        setPendingOptionId,
        getOptionData,
        setOptionData,
        clearOptionData,
      }}
    >
      {children}
    </ShippingSelectionContext.Provider>
  )
}

export const useShippingSelection = () => useContext(ShippingSelectionContext)

/**
 * The option the checkout is working with, whether or not the cart has accepted it yet.
 */
export const useSelectedShippingOptionId = (cart: HttpTypes.StoreCart) => {
  const { pendingOptionId } = useShippingSelection()

  return (
    pendingOptionId ??
    cart.shipping_methods?.at(-1)?.shipping_option_id ??
    null
  )
}
