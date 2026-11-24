"use client"

import { refreshOrdersCache } from "@lib/data/orders"
import { useEffect, useRef } from "react"

/**
 * Refreshes the cached order lists once the page that changed an order has
 * rendered, since a page cannot revalidate a cache tag while it renders.
 */
export default function RefreshOrders() {
  const refreshed = useRef(false)

  useEffect(() => {
    if (refreshed.current) return
    refreshed.current = true
    refreshOrdersCache().catch(() => {})
  }, [])

  return null
}
