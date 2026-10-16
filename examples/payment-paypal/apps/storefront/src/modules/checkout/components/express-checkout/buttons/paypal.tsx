"use client"

import {
  quoteExpressShipping,
  saveExpressContact,
  startExpressPayment,
} from "@lib/data/express-checkout"
import { getPayPalPayer } from "@lib/data/paypal"
import PayPalScope, {
  isNavigation,
} from "@modules/checkout/components/paypal-scope"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useEffect, useRef } from "react"
import type { ExpressButtonProps } from "../registry"

/** Rendered by `PayPalButtons` when PayPal is not available to this customer. */
function Unavailable({ onMount }: { onMount: () => void }) {
  useEffect(onMount, [onMount])
  return null
}

const orderIdOf = (data: Record<string, unknown>) => {
  const id = data.paypal_order_id
  if (typeof id !== "string" || !id) {
    throw new Error("PayPal payment session has no order")
  }
  return id
}

function PayPalWalletButton({
  providerId,
  shippingOptionId,
  onUnavailable,
  onError,
  onBusy,
  placeOrder,
  onClosed,
}: ExpressButtonProps) {
  const [{ isResolved, isRejected }] = usePayPalScriptReducer()
  const orderRef = useRef<string | null>(null)

  useEffect(() => {
    if (isRejected) onUnavailable()
  }, [isRejected, onUnavailable])

  if (isRejected) {
    return null
  }
  if (!isResolved) {
    return (
      <div className="h-12 rounded-md bg-ui-bg-component" aria-hidden="true" />
    )
  }

  // The SDK puts its iframe at z-index 100. `isolate` keeps it under the
  // checkout modals, which would otherwise open beneath the button.
  return (
    <div className="isolate">
      <PayPalButtons
        fundingSource="paypal"
        style={{
          layout: "horizontal",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 48,
          tagline: false,
          disableMaxWidth: true,
        }}
        createOrder={async () => {
          onError(null)
          const orderId = orderIdOf(
            await startExpressPayment(providerId, { express: true })
          )
          orderRef.current = orderId
          return orderId
        }}
        onShippingAddressChange={async (data, actions) => {
          const orderId = data.orderID || orderRef.current
          if (!orderId) return actions.reject()
          try {
            const quote = await quoteExpressShipping(
              {
                country_code: data.shippingAddress.countryCode ?? "",
                province: data.shippingAddress.state,
                city: data.shippingAddress.city,
                postal_code: data.shippingAddress.postalCode,
              },
              shippingOptionId
            )
            if (!quote.ok) return actions.reject()
            // A new total makes Medusa drop the session, so the order the
            // customer is approving moves to a new one, which patches its amount.
            await startExpressPayment(
              providerId,
              { express: true, paypal_order_id: orderId },
              "paypal_order_id"
            )
          } catch {
            return actions.reject()
          }
        }}
        onApprove={async (data) => {
          onBusy(true)
          try {
            const payer = await getPayPalPayer(data.orderID)
            const approved = payer.amount
              ? Number(payer.amount.value)
              : undefined
            const saved = await saveExpressContact(
              {
                email: payer.email,
                phone: payer.phone,
                shipping_address: payer.shipping_address,
              },
              shippingOptionId,
              approved
            )
            if (!saved.ok) {
              onError(
                saved.reason === "totalChanged"
                  ? {
                      code: "totalChanged",
                      total: saved.total,
                      currency_code: saved.currency_code,
                    }
                  : { code: saved.reason }
              )
              onBusy(false)
              onClosed()
              return
            }
            // The saved address may have changed the total once more.
            await startExpressPayment(
              providerId,
              { express: true, paypal_order_id: data.orderID },
              "paypal_order_id"
            )
            await placeOrder()
          } catch (err) {
            if (isNavigation(err)) return
            onError({ code: "failed", cause: err })
            onBusy(false)
            onClosed()
          }
        }}
        onCancel={() => onClosed()}
        onError={(err) => {
          onError({ code: "failed", cause: err })
          onClosed()
        }}
      >
        <Unavailable onMount={onUnavailable} />
      </PayPalButtons>
    </div>
  )
}

/**
 * PayPal in the express checkout row. The customer picks the address in the
 * PayPal window, the row answers with the shipping and the new total, and the
 * order is placed once they approve.
 */
export default function PayPalExpressButton(props: ExpressButtonProps) {
  return (
    <PayPalScope
      currencyCode={props.cart.currency_code}
      onUnavailable={props.onUnavailable}
    >
      <PayPalWalletButton {...props} />
    </PayPalScope>
  )
}
