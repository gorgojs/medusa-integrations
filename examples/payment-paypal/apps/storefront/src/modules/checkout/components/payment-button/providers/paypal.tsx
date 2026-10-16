"use client"

import { isPaypal } from "@lib/constants"
import { startExpressPayment } from "@lib/data/express-checkout"
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
  "data-testid": dataTestId,
}: PaymentProviderButtonProps) {
  const [{ isResolved, isRejected }] = usePayPalScriptReducer()
  const { setSubmitting, errorMessage, setErrorMessage, completeOrder } =
    usePlaceOrder()

  const providerId =
    cart.payment_collection?.payment_sessions?.find((s) =>
      isPaypal(s.provider_id)
    )?.provider_id ?? "pp_paypal_paypal"

  if (isRejected) {
    return <ErrorMessage error="payment failed" data-testid={dataTestId} />
  }
  if (!isResolved) {
    return (
      <div className="h-12 rounded-md bg-ui-bg-component" aria-hidden="true" />
    )
  }

  return (
    <div data-testid={dataTestId}>
      <PayPalButtons
        disabled={notReady || cartUpdating}
        style={{
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 48,
        }}
        // A new session at the click, so the PayPal order carries the cart's
        // total and address as they are when the customer pays.
        createOrder={async () => {
          setErrorMessage(null)
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
