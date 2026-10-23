import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"
import { getLocale, getTranslations } from "next-intl/server"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = async ({ order }: OrderSummaryProps) => {
  const t = await getTranslations("OrderSummary")
  const locale = await getLocale()

  const amount = (value?: number | null) =>
    convertToLocale({
      amount: value ?? 0,
      currency_code: order.currency_code,
      locale,
    })

  return (
    <div className="flex flex-col gap-y-1 txt-medium text-ui-fg-subtle">
      {/* `subtotal` already carries shipping, so listing it here and then
          adding shipping below counted the same money twice. */}
      <div className="flex items-center justify-between">
        <span>{t("subtotal")}</span>
        <span data-testid="order-subtotal">{amount(order.item_subtotal)}</span>
      </div>
      {order.discount_total > 0 && (
        <div className="flex items-center justify-between">
          <span>{t("discount")}</span>
          <span className="text-ui-fg-interactive">
            - {amount(order.discount_total)}
          </span>
        </div>
      )}
      {order.gift_card_total > 0 && (
        <div className="flex items-center justify-between">
          <span>{t("giftCard")}</span>
          <span className="text-ui-fg-interactive">
            - {amount(order.gift_card_total)}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span>{t("shipping")}</span>
        <span data-testid="order-shipping">{amount(order.shipping_total)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>{t("taxes")}</span>
        <span data-testid="order-taxes">{amount(order.tax_total)}</span>
      </div>

      <div className="h-px w-full bg-ui-border-base my-3" />

      <div className="flex items-center justify-between text-ui-fg-base txt-medium-plus">
        <span>{t("total")}</span>
        <span className="txt-xlarge-plus" data-testid="order-total">
          {amount(order.total)}
        </span>
      </div>
    </div>
  )
}

export default OrderSummary
