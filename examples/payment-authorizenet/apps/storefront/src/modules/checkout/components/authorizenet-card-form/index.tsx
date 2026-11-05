"use client"

import { formatCardNumber, formatExpiry, digitsOnly } from "@lib/util/card"
import { Text } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { useTranslations } from "next-intl"
import { useAuthorizeNet } from "../payment-wrapper/authorizenet-wrapper"

/**
 * The card fields for Authorize.net. They live outside any form and the shop's server never sees
 * them: the pay button hands them to Accept.js, which returns a one-time token.
 */
const AuthorizeNetCardForm = () => {
  const t = useTranslations("AuthorizeNetCard")
  const tc = useTranslations("PaymentContainer")
  const authorizeNet = useAuthorizeNet()

  if (!authorizeNet) {
    return <SkeletonCardDetails />
  }

  const { card, setCard } = authorizeNet

  return (
    <div className="my-4 flex flex-col gap-y-2" data-testid="authorizenet-card-form">
      <Text className="txt-medium-plus text-ui-fg-base mb-1">
        {tc("enterPaymentDetails")}
      </Text>
      <Input
        name="authorizenet-card-number"
        label={t("cardNumber")}
        autoComplete="cc-number"
        inputMode="numeric"
        value={card.number}
        onChange={(e) =>
          setCard({ ...card, number: formatCardNumber(e.target.value) })
        }
        required
        data-testid="authorizenet-card-number"
      />
      <div className="grid grid-cols-2 gap-x-2">
        <Input
          name="authorizenet-card-expiry"
          label={t("expiry")}
          autoComplete="cc-exp"
          inputMode="numeric"
          value={card.expiry}
          onChange={(e) =>
            setCard({ ...card, expiry: formatExpiry(e.target.value) })
          }
          required
          data-testid="authorizenet-card-expiry"
        />
        <Input
          name="authorizenet-card-cvc"
          label={t("cvc")}
          autoComplete="cc-csc"
          inputMode="numeric"
          value={card.cvc}
          onChange={(e) =>
            setCard({ ...card, cvc: digitsOnly(e.target.value).slice(0, 4) })
          }
          required
          data-testid="authorizenet-card-cvc"
        />
      </div>
    </div>
  )
}

export default AuthorizeNetCardForm
