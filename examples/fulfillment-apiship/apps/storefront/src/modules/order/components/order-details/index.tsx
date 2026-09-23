import type { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
import { formatDate } from "@lib/util/date"
import OrderStatusBadge from "@modules/order/components/order-status"
import { getLocale, getTranslations } from "next-intl/server"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
  /** Off where the page heading already carries the number. */
  showOrderNumber?: boolean
  locale?: string
}

const OrderDetails = async ({
  order,
  showStatus,
  showOrderNumber = true,
  locale: localeProp,
}: OrderDetailsProps) => {
  const t = await getTranslations("OrderDetails")
  const locale = localeProp ?? (await getLocale())

  const formattedOrderDate = formatDate({ date: order.created_at, locale })

  return (
    <div className="flex flex-col gap-y-2">
      <Text className="txt-medium text-ui-fg-subtle">
        {t("confirmationSentBefore")}{" "}
        <span className="text-ui-fg-base font-medium" data-testid="order-email">
          {order.email}
        </span>
        .
      </Text>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 txt-medium text-ui-fg-subtle">
        <Text>
          {t("orderDate")}{" "}
          <span className="text-ui-fg-base" data-testid="order-date">
            {formattedOrderDate}
          </span>
        </Text>
        {showOrderNumber && (
          <Text>
            {t("orderNumber")}{" "}
            <span className="text-ui-fg-base" data-testid="order-id">
              {order.display_id}
            </span>
          </Text>
        )}
      </div>

      {showStatus && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <OrderStatusBadge
            kind="fulfillment"
            status={order.fulfillment_status}
          />
          <OrderStatusBadge kind="payment" status={order.payment_status} />
        </div>
      )}
    </div>
  )
}

export default OrderDetails
