import { formatAddressLines, joinFilled } from "@lib/util/address"
import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"

import { OrderDetailColumn } from "@modules/order/components/order-section"
import { getLocale, getTranslations } from "next-intl/server"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = async ({ order }: ShippingDetailsProps) => {
  const t = await getTranslations("ShippingDetails")
  const locale = await getLocale()

  const addressLines = formatAddressLines(order.shipping_address)
  const contactLines = [order.shipping_address?.phone, order.email].filter(
    Boolean
  ) as string[]

  const shippingMethod = order.shipping_methods?.[0] as
    | { name?: string; total?: number }
    | undefined
  const shippingMethodLabel = shippingMethod
    ? joinFilled(
        [
          shippingMethod.name,
          convertToLocale({
            amount: shippingMethod.total ?? 0,
            currency_code: order.currency_code,
            locale,
          }),
        ],
        " · "
      )
    : ""

  return (
    <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
      <OrderDetailColumn
        label={t("shippingAddress")}
        data-testid="shipping-address-summary"
      >
        {addressLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </OrderDetailColumn>

      <OrderDetailColumn
        label={t("contact")}
        data-testid="shipping-contact-summary"
      >
        {contactLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </OrderDetailColumn>

      <OrderDetailColumn
        label={t("method")}
        data-testid="shipping-method-summary"
      >
        <span>{shippingMethodLabel}</span>
      </OrderDetailColumn>
    </div>
  )
}

export default ShippingDetails
