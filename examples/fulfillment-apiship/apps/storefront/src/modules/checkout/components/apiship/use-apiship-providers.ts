"use client"

import { useEffect, useState } from "react"
import { retrieveApishipProviders } from "@lib/data/fulfillment"
import type { ApishipProvider } from "./types"

export function useApishipProviders(
  shippingOptionId: string | undefined,
  enabled: boolean
) {
  const [providers, setProviders] = useState<Record<string, ApishipProvider>>(
    {}
  )
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !shippingOptionId || loadedFor === shippingOptionId) return

    let cancelled = false

    retrieveApishipProviders(shippingOptionId).then((list) => {
      if (cancelled || !list) return
      setProviders(
        Object.fromEntries(
          list.flatMap((provider) =>
            provider.key && provider.name ? [[provider.key, provider]] : []
          )
        )
      )
      setLoadedFor(shippingOptionId)
    })

    return () => {
      cancelled = true
    }
  }, [enabled, shippingOptionId, loadedFor])

  return providers
}
