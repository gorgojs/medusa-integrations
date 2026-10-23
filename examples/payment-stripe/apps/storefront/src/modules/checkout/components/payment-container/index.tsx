"use client"

import { Radio as RadioGroupOption } from "@headlessui/react"
import { Text, clx } from "@medusajs/ui"
import React, { useContext } from "react"
import { useTranslations } from "next-intl"

import Radio from "@modules/common/components/radio"

import { isManual, type PaymentInfo } from "@lib/constants"
import { paymentMethodLabel } from "@lib/util/payment"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { PaymentElement } from "@stripe/react-stripe-js"
import PaymentTest from "../payment-test"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, PaymentInfo>
  children?: React.ReactNode
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  const tm = useTranslations("PaymentMethods")
  const { title, subtitle } = paymentMethodLabel(tm, paymentProviderId)
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
        {
          "border-ui-border-interactive":
            selectedPaymentOptionId === paymentProviderId,
        }
      )}
    >
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-x-4">
          <Radio checked={selectedPaymentOptionId === paymentProviderId} />
          <div className="flex flex-col">
            <Text className="text-base-regular">{title}</Text>
            {subtitle && (
              <Text className="txt-compact-xsmall text-ui-fg-muted">
                {subtitle}
              </Text>
            )}
          </div>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden small:block" />
          )}
        </div>
        <span className="justify-self-end text-ui-fg-base">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="small:hidden text-[10px]" />
      )}
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer

type StripePaymentElementProps = {
  setError: (error: string | null) => void
  setPaymentComplete: (complete: boolean) => void
}

/**
 * The Stripe Payment Element with its heading, or a skeleton until the Stripe Elements are
 * ready. It carries no radio of its own: the one-screen checkout shows it under the payment
 * method tiles, and `StripePaymentContainer` wraps it in a radio option for the step-based one.
 */
export const StripePaymentElement = ({
  setError,
  setPaymentComplete,
}: StripePaymentElementProps) => {
  const t = useTranslations("PaymentContainer")
  const stripeReady = useContext(StripeContext)

  if (!stripeReady) {
    return <SkeletonCardDetails />
  }

  return (
      <div className="my-4 transition-all duration-150 ease-in-out">
        <Text className="txt-medium-plus text-ui-fg-base mb-1">
          {t("enterPaymentDetails")}
        </Text>
        <PaymentElement
          // the checkout already has the billing address and passes it on
          // when the payment is confirmed
          options={{
            layout: "accordion",
            fields: { billingDetails: { address: "never" } },
          }}
          onChange={(e) => {
            setError(null)
            setPaymentComplete(e.complete)
          }}
          // Without a handler Stripe.js reports a failed mount as an
          // unhandled "payment Element loaderror" and the option renders
          // blank with no explanation. Surface it in the checkout's own
          // error slot instead.
          onLoadError={(e) => {
            setPaymentComplete(false)
            setError(e.error?.message ?? t("loadError"))
          }}
        />
      </div>
  )
}

export const StripePaymentContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setError,
  setPaymentComplete,
}: Omit<PaymentContainerProps, "children"> & StripePaymentElementProps) => {
  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId && (
        <StripePaymentElement
          setError={setError}
          setPaymentComplete={setPaymentComplete}
        />
      )}
    </PaymentContainer>
  )
}
