"use client"

import { placeOrder } from "@lib/data/cart"
import { revalidateExpressCheckout } from "@lib/data/express-checkout"
import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useSelectedShippingOptionId } from "@modules/checkout/context/shipping-selection-context"
import { useLocale, useTranslations } from "next-intl"
import { unstable_rethrow, useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { type ExpressCheckoutError, expressButtons } from "./registry"

/**
 * The text of a wallet failure for the shared error messages, which map it to a
 * translated message. One without text still reads as a failed payment.
 */
const failureText = (cause: unknown) =>
  (cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "") ||
  "payment failed"

type ExpressCheckoutProps = {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
}

/**
 * Wallet buttons above the checkout, each paying the whole order from its own
 * window: the wallet shares the address, the row answers with the shipping and
 * the new total, and the order is placed once the customer pays. Buttons come
 * from `registry.ts`, and the row renders nothing while none of them applies.
 */
export default function ExpressCheckout({
  cart,
  availablePaymentMethods,
}: ExpressCheckoutProps) {
  const t = useTranslations("ExpressCheckout")
  const locale = useLocale()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const shippingOptionId = useSelectedShippingOptionId(cart)
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [error, setError] = useState<ExpressCheckoutError | null>(null)
  const [busy, setBusy] = useState(false)

  const buttons = expressButtons.flatMap(({ match, Component }) => {
    const provider = availablePaymentMethods.find((method) => match(method.id))
    return provider && !unavailable.includes(provider.id)
      ? [{ providerId: provider.id, Component }]
      : []
  })

  const onClosed = useCallback(() => {
    startTransition(() => {
      revalidateExpressCheckout().catch(() => router.refresh())
    })
  }, [router])

  const placeOrderFromWallet = useCallback(async () => {
    try {
      await placeOrder()
    } catch (err) {
      // A placed order ends in `redirect()`, which arrives here as a
      // NEXT_REDIRECT control-flow error rather than a failure.
      unstable_rethrow(err)
      setError({ code: "failed", cause: err })
      setBusy(false)
      onClosed()
    }
  }, [onClosed])

  if (!buttons.length) {
    return null
  }

  const message =
    error?.code === "totalChanged"
      ? t("totalChanged", {
          total: convertToLocale({
            amount: error.total,
            currency_code: error.currency_code,
            locale,
          }),
        })
      : error?.code === "noShipping" || error?.code === "missingContact"
        ? t(error.code)
        : null

  return (
    <section
      className="flex flex-col gap-y-3"
      aria-label={t("title")}
      aria-busy={busy}
      data-testid="express-checkout"
    >
      <p className="txt-compact-small-plus text-ui-fg-subtle">{t("title")}</p>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${buttons.length}, minmax(0, 1fr))`,
        }}
      >
        {buttons.map(({ providerId, Component }) => (
          <Component
            key={providerId}
            cart={cart}
            providerId={providerId}
            shippingOptionId={shippingOptionId}
            onUnavailable={() =>
              setUnavailable((ids) =>
                ids.includes(providerId) ? ids : [...ids, providerId]
              )
            }
            onError={setError}
            onBusy={setBusy}
            placeOrder={placeOrderFromWallet}
            onClosed={onClosed}
          />
        ))}
      </div>
      {message ? (
        <p
          className="text-rose-500 text-small-regular"
          data-testid="express-checkout-error"
        >
          {message}
        </p>
      ) : error?.code === "failed" ? (
        <ErrorMessage
          error={failureText(error.cause)}
          data-testid="express-checkout-error"
        />
      ) : null}
      <div
        className="flex items-center gap-x-3 txt-compact-small text-ui-fg-muted"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-ui-border-base" />
        <span>{t("or")}</span>
        <span className="h-px flex-1 bg-ui-border-base" />
      </div>
    </section>
  )
}
