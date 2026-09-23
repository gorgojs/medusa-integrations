"use client"

import { placeOrder } from "@lib/data/cart"
import type { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import { unstable_rethrow } from "next/navigation"
import { type ReactNode, useCallback, useState } from "react"

/**
 * Props every button under `providers/` receives. They all take the same shape,
 * so the dispatcher in `index.tsx` hands one set of values to whichever button
 * the active payment provider selects.
 */
export type PaymentProviderButtonProps = {
  cart: HttpTypes.StoreCart
  notReady: boolean
  label: ReactNode
  cartUpdating: boolean
  "data-testid"?: string
}

/**
 * Order placement shared by every payment button. It holds the submitting flag
 * and the error message, and a provider button drives both from its own payment
 * flow.
 */
export const usePlaceOrder = () => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const completeOrder = useCallback(async () => {
    await placeOrder().catch((err) => {
      // A successful `placeOrder` ends in `redirect()`, which reaches this
      // catch as a NEXT_REDIRECT control-flow error rather than a failure.
      // Swallowing it would paint "something went wrong" over a placed order.
      unstable_rethrow(err)

      setErrorMessage(err.message)
      setSubmitting(false)
    })
  }, [])

  return {
    submitting,
    setSubmitting,
    errorMessage,
    setErrorMessage,
    completeOrder,
  }
}

type PaymentButtonShellProps = {
  label: ReactNode
  onClick: () => void
  disabled: boolean
  loading: boolean
  errorMessage: string | null
  errorTestId: string
  "data-testid"?: string
}

/**
 * The markup every payment button shares. A provider button keeps its own
 * payment flow and renders the outcome through this.
 */
export const PaymentButtonShell = ({
  label,
  onClick,
  disabled,
  loading,
  errorMessage,
  errorTestId,
  "data-testid": dataTestId,
}: PaymentButtonShellProps) => {
  return (
    <>
      <Button
        disabled={disabled}
        onClick={onClick}
        size="large"
        isLoading={loading}
        className="w-full"
        data-testid={dataTestId}
      >
        {label}
      </Button>
      <ErrorMessage error={errorMessage} data-testid={errorTestId} />
    </>
  )
}
