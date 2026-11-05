"use client"

import { initiatePaymentSession } from "@lib/data/cart"
import { AcceptError, type AcceptProblem, createCardToken } from "@lib/util/accept-js"
import { findCardProblem } from "@lib/util/card"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useAuthorizeNet } from "@modules/checkout/components/payment-wrapper/authorizenet-wrapper"
import {
  PaymentButtonShell,
  type PaymentProviderButtonProps,
  usePlaceOrder,
} from "../shared"

type AuthorizeNetButtonProps = PaymentProviderButtonProps & { providerId: string }

/**
 * Pays with the card form. Nothing reaches Authorize.net before this click: the button checks the
 * card, has Accept.js turn it into a one-time token, starts the payment session with that token and
 * places the order. The backend runs the transaction while the order is placed, so a declined card
 * comes back as the order's error, which the shared error messages turn into a failed payment.
 * A problem with the card itself, found here or by Accept.js, is shown in its own words instead:
 * the shared messages would read the word "card" in it as a failed payment too.
 */
const AuthorizeNetPayButton = ({
  cart,
  providerId,
  notReady,
  label,
  cartUpdating,
  "data-testid": dataTestId,
}: AuthorizeNetButtonProps) => {
  const t = useTranslations("AuthorizeNetCard")
  const authorizeNet = useAuthorizeNet()!
  const {
    submitting,
    setSubmitting,
    errorMessage,
    setErrorMessage,
    completeOrder,
  } = usePlaceOrder()
  const [cardProblem, setCardProblem] = useState<AcceptProblem | null>(null)

  const fail = (message: string) => {
    setErrorMessage(message)
    setSubmitting(false)
  }

  const failOnCard = (problem: AcceptProblem) => {
    setCardProblem(problem)
    setSubmitting(false)
  }

  const handlePayment = async () => {
    if (submitting) {
      return
    }
    setCardProblem(null)
    setErrorMessage(null)

    const problem = findCardProblem(authorizeNet.card)
    if (problem) {
      return failOnCard(problem)
    }

    setSubmitting(true)

    let opaqueData
    try {
      opaqueData = await createCardToken(authorizeNet.card, {
        apiLoginId: authorizeNet.config.api_login_id,
        clientKey: authorizeNet.config.client_key,
      })
    } catch (err) {
      return failOnCard(err instanceof AcceptError ? err.problem : "tokenError")
    }

    try {
      await initiatePaymentSession(cart, {
        provider_id: providerId,
        data: { opaque_data: opaqueData },
      })
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err))
    }

    await completeOrder()
  }

  return (
    <>
      <PaymentButtonShell
        label={label}
        onClick={handlePayment}
        disabled={notReady || !authorizeNet.acceptReady}
        loading={submitting || cartUpdating}
        errorMessage={errorMessage}
        errorTestId="authorizenet-payment-error-message"
        data-testid={dataTestId}
      />
      {cardProblem && (
        <div
          className="pt-2 text-rose-500 text-small-regular"
          data-testid="authorizenet-card-error-message"
        >
          <span>{t(cardProblem)}</span>
        </div>
      )}
    </>
  )
}

/**
 * The checkout leaves Accept.js out when Authorize.net is not configured in the Admin or the cart
 * has nothing to pay. The button then stays disabled.
 */
const AuthorizeNetPaymentButton = (props: AuthorizeNetButtonProps) => {
  const authorizeNet = useAuthorizeNet()

  if (!authorizeNet) {
    return (
      <PaymentButtonShell
        label={props.label}
        onClick={() => {}}
        disabled
        loading={props.cartUpdating}
        errorMessage={null}
        errorTestId="authorizenet-payment-error-message"
        data-testid={props["data-testid"]}
      />
    )
  }

  return <AuthorizeNetPayButton {...props} />
}

export default AuthorizeNetPaymentButton
