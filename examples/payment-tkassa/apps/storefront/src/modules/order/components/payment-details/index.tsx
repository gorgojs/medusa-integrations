import { Container } from "@medusajs/ui"

import { isStripeLike, paymentInfoMap } from "@lib/constants"
import { paymentMethodName } from "@lib/util/payment"
import { formatDateTime } from "@lib/util/date"
import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"
import { OrderDetailColumn } from "@modules/order/components/order-section"
import { getLocale, getTranslations } from "next-intl/server"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = async ({ order }: PaymentDetailsProps) => {
  const [t, tm, locale] = await Promise.all([
    getTranslations("PaymentDetails"),
    getTranslations("PaymentMethods"),
    getLocale(),
  ])
  const payment = order.payment_collections?.[0]?.payments?.[0]

  if (!payment) {
    return null
  }

  const card = isStripeLike(payment.provider_id) && payment.data?.card_last4

  return (
    <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
      <OrderDetailColumn label={t("paymentMethod")}>
        <span data-testid="payment-method">
          {paymentMethodName(tm, payment.provider_id)}
        </span>
      </OrderDetailColumn>

      <OrderDetailColumn label={t("paymentDetails")}>
        <div className="flex gap-x-2 items-center">
          <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
            {paymentInfoMap[payment.provider_id]?.icon}
          </Container>
          <span data-testid="payment-amount">
            {card
              ? `**** **** **** ${payment.data?.card_last4}`
              : `${convertToLocale({
                  amount: payment.amount,
                  currency_code: order.currency_code,
                  locale,
                })} ${t("paidAt")} ${formatDateTime({
                  date: payment.created_at ?? "",
                  locale,
                })}`}
          </span>
        </div>
      </OrderDetailColumn>
    </div>
  )
}

export default PaymentDetails
