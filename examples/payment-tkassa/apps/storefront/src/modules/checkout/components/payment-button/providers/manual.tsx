"use client"

import {
  PaymentButtonShell,
  type PaymentProviderButtonProps,
  usePlaceOrder,
} from "../shared"

const ManualPaymentButton = ({
  notReady,
  label,
  cartUpdating,
  "data-testid": dataTestId,
}: PaymentProviderButtonProps) => {
  const { submitting, setSubmitting, errorMessage, completeOrder } =
    usePlaceOrder()

  const handlePayment = () => {
    setSubmitting(true)

    completeOrder()
  }

  return (
    <PaymentButtonShell
      label={label}
      onClick={handlePayment}
      disabled={notReady}
      loading={submitting || cartUpdating}
      errorMessage={errorMessage}
      errorTestId="manual-payment-error-message"
      data-testid={dataTestId ?? "submit-order-button"}
    />
  )
}

export default ManualPaymentButton
