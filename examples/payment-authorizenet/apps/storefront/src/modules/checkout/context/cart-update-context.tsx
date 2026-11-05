"use client"

import { createContext, useCallback, useContext, useState } from "react"

type CartUpdateContextValue = {
  isCartUpdating: boolean
  trackCartUpdate: <T>(update: () => Promise<T>) => Promise<T>
}

const CartUpdateContext = createContext<CartUpdateContextValue>({
  isCartUpdating: false,
  trackCartUpdate: (update) => update(),
})

export function CartUpdateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [pendingCount, setPendingCount] = useState(0)

  const trackCartUpdate = useCallback(
    async <T,>(update: () => Promise<T>): Promise<T> => {
      setPendingCount((c) => c + 1)
      try {
        return await update()
      } finally {
        setPendingCount((c) => c - 1)
      }
    },
    []
  )

  return (
    <CartUpdateContext.Provider
      value={{ isCartUpdating: pendingCount > 0, trackCartUpdate }}
    >
      {children}
    </CartUpdateContext.Provider>
  )
}

export const useCartUpdate = () => useContext(CartUpdateContext)
