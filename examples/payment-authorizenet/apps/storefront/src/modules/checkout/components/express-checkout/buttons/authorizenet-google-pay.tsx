"use client"

import GooglePayButton from "@google-pay/button-react"
import {
  quoteExpressShipping,
  saveExpressContact,
  startExpressPayment,
} from "@lib/data/express-checkout"
import type { AuthorizeNetConfig } from "@lib/data/authorizenet"
import { convertToLocale } from "@lib/util/money"
import { useAuthorizeNet } from "@modules/checkout/components/payment-wrapper/authorizenet-wrapper"
import { unstable_rethrow } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import type { ExpressButtonProps } from "../registry"

/** The data descriptor Authorize.net expects for a Google Pay token. */
const GOOGLE_PAY_DATA_DESCRIPTOR = "COMMON.GOOGLE.INAPP.PAYMENT"

/**
 * True for the control-flow error a placed order's `redirect()` throws. The router follows the
 * redirect on its own, so the handler reports success instead of a failure over the placed order.
 */
const isNavigation = (error: unknown) => {
  try {
    unstable_rethrow(error)
    return false
  } catch {
    return true
  }
}

const splitName = (name?: string | null) => {
  const [first = "", ...rest] = (name ?? "").trim().split(/\s+/)
  return { first_name: first, last_name: rest.join(" ") }
}

/** An amount as Google Pay takes it, with the currency's decimals: `"19.99"`. */
const toPrice = (amount: number, currencyCode: string) => {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: currencyCode })
    .resolvedOptions().maximumFractionDigits ?? 2
  return amount.toFixed(digits)
}

type GooglePaySettings = NonNullable<AuthorizeNetConfig["google_pay"]>

/**
 * Google Pay in the express checkout row. The sheet asks for the address, the row quotes the
 * shipping for it, and the payment goes to Authorize.net as a Google Pay token through the same
 * provider as the card form: the backend charges it while the order is placed.
 */
function GooglePayWalletButton({
  cart,
  providerId,
  shippingOptionId,
  onUnavailable,
  onError,
  onBusy,
  placeOrder,
  onClosed,
  googlePay,
}: ExpressButtonProps & { googlePay: GooglePaySettings }) {
  const t = useTranslations("ExpressCheckout")
  const te = useTranslations("Errors")
  const locale = useLocale()
  const currencyCode = cart.currency_code.toUpperCase()
  // what the sheet showed last, so a total that grows after approval is refused
  const shownTotal = useRef(cart.total ?? 0)
  const optionId = useRef<string | null>(shippingOptionId)

  const fail = (
    error: Parameters<ExpressButtonProps["onError"]>[0],
    message: string,
    reason: google.payments.api.ErrorReason = "OTHER_ERROR"
  ): google.payments.api.PaymentAuthorizationResult => {
    onError(error)
    onBusy(false)
    onClosed()
    return {
      transactionState: "ERROR",
      error: { intent: "PAYMENT_AUTHORIZATION", reason, message },
    }
  }

  const onPaymentDataChanged: google.payments.api.PaymentDataChangedHandler = async (data) => {
    if (data.callbackTrigger === "SHIPPING_OPTION") {
      return {}
    }
    const address = data.shippingAddress
    const quote = await quoteExpressShipping(
      {
        country_code: address?.countryCode ?? "",
        province: address?.administrativeArea,
        city: address?.locality,
        postal_code: address?.postalCode,
      },
      optionId.current
    )
    if (!quote.ok) {
      return {
        error: {
          intent: "SHIPPING_ADDRESS",
          reason: "SHIPPING_ADDRESS_UNSERVICEABLE",
          message: t("noShipping"),
        },
      }
    }
    optionId.current = quote.shipping_option_id
    shownTotal.current = quote.total
    return {
      newTransactionInfo: {
        totalPriceStatus: "FINAL",
        totalPrice: toPrice(quote.total, currencyCode),
        currencyCode,
      },
      newShippingOptionParameters: {
        defaultSelectedOptionId: quote.shipping_option_id,
        shippingOptions: [
          {
            id: quote.shipping_option_id,
            label: quote.shipping_option_name,
            description: convertToLocale({
              amount: quote.shipping_total,
              currency_code: quote.currency_code,
              locale,
            }),
          },
        ],
      },
    }
  }

  const onPaymentAuthorized: google.payments.api.PaymentAuthorizedHandler = async (paymentData) => {
    onBusy(true)
    onError(null)
    const shipping = paymentData.shippingAddress
    try {
      const saved = await saveExpressContact(
        {
          email: paymentData.email,
          phone: shipping?.phoneNumber,
          shipping_address: shipping
            ? {
                ...splitName(shipping.name),
                address_1: shipping.address1,
                address_2: [shipping.address2, shipping.address3].filter(Boolean).join(" "),
                city: shipping.locality,
                province: shipping.administrativeArea,
                postal_code: shipping.postalCode,
                country_code: shipping.countryCode,
              }
            : null,
        },
        optionId.current,
        shownTotal.current
      )
      if (!saved.ok) {
        if (saved.reason === "totalChanged") {
          const total = convertToLocale({ amount: saved.total, currency_code: saved.currency_code, locale })
          return fail(
            { code: "totalChanged", total: saved.total, currency_code: saved.currency_code },
            t("totalChanged", { total })
          )
        }
        return saved.reason === "noShipping"
          ? fail({ code: "noShipping" }, t("noShipping"), "SHIPPING_ADDRESS_UNSERVICEABLE")
          : fail({ code: "missingContact" }, t("missingContact"))
      }

      await startExpressPayment(providerId, {
        opaque_data: {
          dataDescriptor: GOOGLE_PAY_DATA_DESCRIPTOR,
          dataValue: window.btoa(paymentData.paymentMethodData.tokenizationData.token),
        },
        express: true,
      })
      // the row shows why an order was not placed and resolves; a placed order redirects
      await placeOrder()
      return {
        transactionState: "ERROR",
        error: { intent: "PAYMENT_AUTHORIZATION", reason: "OTHER_ERROR", message: te("paymentFailed") },
      }
    } catch (err) {
      if (isNavigation(err)) {
        return { transactionState: "SUCCESS" }
      }
      return fail({ code: "failed", cause: err }, te("paymentFailed"))
    }
  }

  const paymentRequest: google.payments.api.PaymentDataRequest = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [
      {
        type: "CARD",
        parameters: {
          allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
          allowedCardNetworks: ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"],
          billingAddressRequired: true,
          billingAddressParameters: { format: "FULL", phoneNumberRequired: true },
        },
        tokenizationSpecification: {
          type: "PAYMENT_GATEWAY",
          parameters: {
            gateway: "authorizenet",
            gatewayMerchantId: googlePay.gateway_merchant_id,
          },
        },
      },
    ],
    // the types require merchantId, but the TEST environment works without one; the Admin
    // refuses Google Pay in production without it
    merchantInfo: {
      ...(googlePay.merchant_id ? { merchantId: googlePay.merchant_id } : {}),
      ...(process.env.NEXT_PUBLIC_SITE_NAME ? { merchantName: process.env.NEXT_PUBLIC_SITE_NAME } : {}),
    } as google.payments.api.MerchantInfo,
    transactionInfo: {
      totalPriceStatus: "ESTIMATED",
      totalPrice: toPrice(cart.total ?? 0, currencyCode),
      currencyCode,
    },
    emailRequired: true,
    shippingAddressRequired: true,
    shippingAddressParameters: {
      allowedCountryCodes: (cart.region?.countries ?? [])
        .map((country) => country.iso_2?.toUpperCase())
        .filter((code): code is string => Boolean(code)),
      phoneNumberRequired: true,
    },
    shippingOptionRequired: true,
    callbackIntents: ["SHIPPING_ADDRESS", "SHIPPING_OPTION", "PAYMENT_AUTHORIZATION"],
  }

  return (
    // `isolate` keeps the Google Pay iframe under the checkout modals
    <div className="isolate" data-testid="authorizenet-google-pay">
      <GooglePayButton
        environment={googlePay.environment}
        paymentRequest={paymentRequest}
        onPaymentDataChanged={onPaymentDataChanged}
        onPaymentAuthorized={onPaymentAuthorized}
        onReadyToPayChange={({ isReadyToPay }) => {
          if (!isReadyToPay) onUnavailable()
        }}
        onCancel={() => {
          onBusy(false)
          onClosed()
        }}
        onError={(error) => {
          onError({ code: "failed", cause: error })
          onBusy(false)
        }}
        buttonType="pay"
        buttonSizeMode="fill"
        buttonLocale={locale}
        style={{ width: "100%", height: 48 }}
      />
    </div>
  )
}

/** Tells the row there is no Google Pay here, once, so it hides the button. */
function Unavailable({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount()
    // the row hides this button for good, so once is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/**
 * The button exists only where the checkout loaded Authorize.net and Google Pay is on in the
 * Admin. Anywhere else the row hides it.
 */
export default function AuthorizeNetGooglePayButton(props: ExpressButtonProps) {
  const googlePay = useAuthorizeNet()?.config.google_pay

  if (!googlePay) {
    return <Unavailable onMount={props.onUnavailable} />
  }

  return <GooglePayWalletButton {...props} googlePay={googlePay} />
}
