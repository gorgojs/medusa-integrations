"use client"

import { isPaypal } from "@lib/constants"
import { startExpressPayment } from "@lib/data/express-checkout"
import { Button } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import PayPalScope, {
  isNavigation,
} from "@modules/checkout/components/paypal-scope"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { type PaymentProviderButtonProps, usePlaceOrder } from "../shared"

function PayPalButtonsInner({
  cart,
  notReady,
  cartUpdating,
  label,
  "data-testid": dataTestId,
}: PaymentProviderButtonProps) {
  const [{ isResolved, isRejected }] = usePayPalScriptReducer()
  const { setSubmitting, errorMessage, setErrorMessage, completeOrder } =
    usePlaceOrder()

  const providerId =
    cart.payment_collection?.payment_sessions?.find((s) =>
      isPaypal(s.provider_id)
    )?.provider_id ?? "pp_paypal_paypal"

  // The PayPal buttons show once the checkout has what the order needs.
  if (notReady || cartUpdating) {
    return (
      <Button
        disabled
        size="large"
        isLoading={cartUpdating}
        className="w-full"
        data-testid={dataTestId}
      >
        {label}
      </Button>
    )
  }
  if (isRejected) {
    return <ErrorMessage error="payment failed" data-testid={dataTestId} />
  }
  if (!isResolved) {
    return (
      <div className="h-12 rounded-md bg-ui-bg-component" aria-hidden="true" />
    )
  }

  // `isolate` keeps the SDK's iframe, at z-index 100, under the checkout modals.
  return (
    <div className="isolate" data-testid={dataTestId}>
      <PayPalButtons
        style={{
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 48,
        }}
        // The order of the session the checkout started when the cart was ready.
        // Without one, a new session at the click carries the cart as it is now.
        createOrder={async () => {
          setErrorMessage(null)
          const pending = cart.payment_collection?.payment_sessions?.find(
            (s) => isPaypal(s.provider_id) && s.status === "pending"
          )?.data?.paypal_order_id
          if (typeof pending === "string" && pending) {
            return pending
          }
          const data = await startExpressPayment(providerId, {
            shipping_address: cart.shipping_address,
          })
          const orderId = data.paypal_order_id
          if (typeof orderId !== "string" || !orderId) {
            throw new Error("PayPal payment session has no order")
          }
          return orderId
        }}
        onApprove={async () => {
          setSubmitting(true)
          try {
            await completeOrder()
          } catch (err) {
            if (isNavigation(err)) return
            throw err
          }
        }}
        onCancel={() => setSubmitting(false)}
        onError={(err) => {
          setErrorMessage(err instanceof Error ? err.message : "payment failed")
          setSubmitting(false)
        }}
      />
      <ErrorMessage
        error={errorMessage}
        data-testid="paypal-payment-error-message"
      />
    </div>
  )
}

/** The PayPal button at the payment step, in place of the order button. */
const PayPalPaymentButton = (props: PaymentProviderButtonProps) => (
  <PayPalScope currencyCode={props.cart.currency_code}>
    <PayPalButtonsInner {...props} />
  </PayPalScope>
)

export default PayPalPaymentButton
