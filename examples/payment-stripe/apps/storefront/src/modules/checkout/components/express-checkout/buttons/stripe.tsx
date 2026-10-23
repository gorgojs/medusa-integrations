"use client"

import {
  quoteExpressShipping,
  saveExpressContact,
  startExpressPayment,
} from "@lib/data/express-checkout"
import { toStripeAmount } from "@lib/util/stripe-amount"
import { StripeContext } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import {
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import type {
  ShippingRate,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementShippingAddressChangeEvent,
} from "@stripe/stripe-js"
import { unstable_rethrow } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useContext, useEffect, useRef } from "react"
import type { ExpressButtonProps } from "../registry"

/**
 * True for the control-flow error a placed order's `redirect()` throws. The router follows
 * the redirect on its own, so the handler returns instead of reporting a failure over the
 * placed order.
 */
const isNavigation = (error: unknown) => {
  try {
    unstable_rethrow(error)
    return false
  } catch {
    return true
  }
}

// Both statuses mean the money is secured, whether it is captured now or later.
const isPaymentSettled = (status?: string) =>
  status === "requires_capture" || status === "succeeded"

const splitName = (name?: string | null) => {
  const [first = "", ...rest] = (name ?? "").trim().split(/\s+/)
  return { first_name: first, last_name: rest.join(" ") }
}

function StripeWalletButton({
  cart,
  providerId,
  shippingOptionId,
  onUnavailable,
  onError,
  onBusy,
  placeOrder,
  onClosed,
}: ExpressButtonProps) {
  const t = useTranslations("CheckoutPage")
  const locale = useLocale()
  const stripe = useStripe()
  const elements = useElements()
  const currency = cart.currency_code
  // what the wallet sheet shows, the quoted shipping and the total the customer approves
  const rateRef = useRef<ShippingRate | null>(null)
  const shownTotalRef = useRef<number | undefined>(undefined)

  const currentShipping = cart.shipping_methods?.at(-1)
  const initialRate: ShippingRate = {
    id: currentShipping?.shipping_option_id ?? "shipping",
    displayName: currentShipping?.name ?? t("shippingCost"),
    amount: toStripeAmount(currentShipping?.amount ?? 0, currency),
  }

  const fail = (
    event: StripeExpressCheckoutElementConfirmEvent,
    error: Parameters<ExpressButtonProps["onError"]>[0]
  ) => {
    event.paymentFailed({ reason: "fail" })
    onError(error)
    onBusy(false)
    onClosed()
  }

  const handleShippingAddressChange = async (
    event: StripeExpressCheckoutElementShippingAddressChangeEvent
  ) => {
    try {
      // the wallet shares only the city, region, postal code and country before payment
      const quote = await quoteExpressShipping(
        {
          country_code: event.address.country,
          province: event.address.state,
          city: event.address.city,
          postal_code: event.address.postal_code,
        },
        rateRef.current?.id ?? shippingOptionId
      )
      if (!quote.ok) {
        return event.reject()
      }
      rateRef.current = {
        id: quote.shipping_option_id,
        displayName: quote.shipping_option_name,
        amount: toStripeAmount(quote.shipping_total, quote.currency_code),
      }
      shownTotalRef.current = quote.total
      elements?.update({ amount: toStripeAmount(quote.total, quote.currency_code) })
      event.resolve({ shippingRates: [rateRef.current] })
    } catch {
      event.reject()
    }
  }

  const handleConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) {
      return fail(event, { code: "failed" })
    }
    onBusy(true)

    const { error: formError } = await elements.submit()
    if (formError) {
      return fail(event, { code: "failed", cause: formError })
    }

    try {
      const address = event.shippingAddress?.address
      // the full address arrives only now, after the customer approved the payment
      const saved = await saveExpressContact(
        {
          email: event.billingDetails?.email,
          phone: event.billingDetails?.phone,
          shipping_address: address
            ? {
                ...splitName(event.shippingAddress?.name),
                address_1: address.line1,
                address_2: address.line2,
                city: address.city,
                province: address.state,
                postal_code: address.postal_code,
                country_code: address.country,
              }
            : null,
        },
        rateRef.current?.id ?? shippingOptionId,
        shownTotalRef.current
      )
      if (!saved.ok) {
        // no PaymentIntent exists yet, so nothing was charged
        return fail(
          event,
          saved.reason === "totalChanged"
            ? { code: "totalChanged", total: saved.total, currency_code: saved.currency_code }
            : { code: saved.reason }
        )
      }

      // the wallet sends its delivery address with the confirmation, so the provider sets none
      const session = await startExpressPayment(providerId, { express: true })
      const clientSecret = session.client_secret
      if (typeof clientSecret !== "string") {
        return fail(event, { code: "failed" })
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/api/payment-return?cart_id=${cart.id}&locale=${locale}`,
        },
        redirect: "if_required",
      })
      const status = error ? error.payment_intent?.status : paymentIntent.status
      if (!isPaymentSettled(status)) {
        onError({ code: "failed", cause: error })
        onBusy(false)
        onClosed()
        return
      }
      await placeOrder()
    } catch (err) {
      if (isNavigation(err)) return
      onError({ code: "failed", cause: err })
      onBusy(false)
      onClosed()
    }
  }

  return (
    // `isolate` keeps the wallet iframes under the checkout modals
    <div className="isolate">
      <ExpressCheckoutElement
        options={{
          emailRequired: true,
          phoneNumberRequired: true,
          shippingAddressRequired: true,
          allowedShippingCountries: (cart.region?.countries ?? [])
            .map((country) => country.iso_2?.toUpperCase())
            .filter((code): code is string => Boolean(code)),
          // PayPal has its own plugin, and Klarna and Amazon Pay need the pre-authorized
          // amount to match the final one
          paymentMethods: {
            applePay: "auto",
            googlePay: "auto",
            link: "auto",
            paypal: "never",
            klarna: "never",
            amazonPay: "never",
          },
          buttonHeight: 48,
          layout: { maxColumns: 3, overflow: "never" },
        }}
        onReady={({ availablePaymentMethods }) => {
          if (!availablePaymentMethods) onUnavailable()
        }}
        onLoadError={() => onUnavailable()}
        onClick={(event) => {
          // resolved within Stripe's one second, so nothing here waits on the server
          onError(null)
          rateRef.current = null
          shownTotalRef.current = undefined
          event.resolve({ shippingRates: [initialRate] })
        }}
        onShippingAddressChange={handleShippingAddressChange}
        onShippingRateChange={(event) => event.resolve()}
        onConfirm={handleConfirm}
        onCancel={() => {
          onBusy(false)
          onClosed()
        }}
      />
    </div>
  )
}

/** Tells the row there is no Stripe button where the checkout is not inside the Stripe Elements. */
function Unavailable({ onMount }: { onMount: () => void }) {
  useEffect(onMount, [onMount])
  return null
}

/**
 * Apple Pay, Google Pay and Link in the express checkout row. The customer picks the address
 * in the wallet, the row answers with the shipping and the new total, and the PaymentIntent is
 * created and confirmed once they approve.
 */
export default function StripeExpressButton(props: ExpressButtonProps) {
  const insideElements = useContext(StripeContext)
  if (!insideElements) {
    return <Unavailable onMount={props.onUnavailable} />
  }
  return <StripeWalletButton {...props} />
}
