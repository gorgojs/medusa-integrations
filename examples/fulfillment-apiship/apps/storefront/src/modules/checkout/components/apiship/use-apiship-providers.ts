"use client"

import { useEffect, useState } from "react"
import { retrieveApishipProviders } from "@lib/data/apiship"
import type { ApishipProvider } from "types/apiship"

type ProvidersByKey = Record<string, ApishipProvider>

const providersByOption = new Map<string, Promise<ProvidersByKey | null>>()

const loadProviders = (shippingOptionId: string) => {
  const cached = providersByOption.get(shippingOptionId)
  if (cached) return cached

  const loading = retrieveApishipProviders(shippingOptionId).then((list) => {
    if (!list) {
      providersByOption.delete(shippingOptionId)
      return null
    }

    return Object.fromEntries(
      list.flatMap((provider) =>
        provider.key && provider.name ? [[provider.key, provider]] : []
      )
    ) as ProvidersByKey
  })

  providersByOption.set(shippingOptionId, loading)
  return loading
}

export function useApishipProviders(
  shippingOptionId: string | undefined,
  enabled: boolean
) {
  const [providers, setProviders] = useState<ProvidersByKey>({})

  useEffect(() => {
    if (!enabled || !shippingOptionId) return

    let cancelled = false

    loadProviders(shippingOptionId).then((loaded) => {
      if (!cancelled && loaded) setProviders(loaded)
    })

    return () => {
      cancelled = true
    }
  }, [enabled, shippingOptionId])

  return providers
}
