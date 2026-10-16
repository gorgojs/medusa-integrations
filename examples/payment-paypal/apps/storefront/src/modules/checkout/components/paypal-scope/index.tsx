"use client"

import { getPayPalConfig, type PayPalConfig } from "@lib/data/paypal"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { unstable_rethrow } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"

// One request per page, shared by every PayPal button on it.
let configRequest: Promise<PayPalConfig | null> | null = null

/** The PayPal settings, `undefined` while they load and `null` without a PayPal integration. */
export const usePayPalConfig = () => {
  const [config, setConfig] = useState<PayPalConfig | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    configRequest ??= getPayPalConfig().catch(() => null)
    configRequest.then((value) => {
      if (active) setConfig(value)
    })
    return () => {
      active = false
    }
  }, [])

  return config
}

/**
 * True for the control-flow error a placed order's `redirect()` throws. The
 * router follows the redirect on its own, so a PayPal callback that meets it
 * returns instead of reporting a failure over the placed order.
 */
export const isNavigation = (error: unknown) => {
  try {
    unstable_rethrow(error)
    return false
  } catch {
    return true
  }
}

/**
 * Loads the PayPal JS SDK for the buttons inside it, with the client ID and the
 * intent the backend creates orders with and the cart's currency. Keyed by the
 * currency, because the provider reads its options once and a change inside a
 * mounted provider leaves the buttons blank.
 */
export default function PayPalScope({
  currencyCode,
  onUnavailable,
  children,
}: {
  currencyCode?: string | null
  /** Called when the store has no PayPal integration configured. */
  onUnavailable?: () => void
  children: ReactNode
}) {
  const config = usePayPalConfig()

  useEffect(() => {
    if (config === null) onUnavailable?.()
  }, [config, onUnavailable])

  if (!config) {
    return null
  }

  const currency = (currencyCode || "usd").toUpperCase()
  return (
    <PayPalScriptProvider
      key={currency}
      options={{
        clientId: config.client_id,
        currency,
        intent: config.intent,
        components: "buttons",
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}
