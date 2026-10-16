import type { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import { Link } from "@i18n/navigation"
import ChevronDown from "@modules/common/icons/chevron-down"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSection from "@modules/order/components/order-section"
import OrderSummary from "@modules/order/components/order-summary"
import PaymentDetails from "@modules/order/components/payment-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import { getTranslations } from "next-intl/server"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate = async ({ order }: OrderDetailsTemplateProps) => {
  const t = await getTranslations("OrderDetails")
  const tc = await getTranslations("Common")
  const th = await getTranslations("Help")
  const ts = await getTranslations("ShippingDetails")
  const tp = await getTranslations("PaymentDetails")
  const to = await getTranslations("OrderSummary")

  const hasPayment = Boolean(order.payment_collections?.[0]?.payments?.[0])

  return (
    <div className="flex flex-col gap-y-8" data-testid="order-details-container">
      <div className="flex flex-col gap-y-3">
        {/* A back link belongs above the title it leads away from, and the
            chevron says "back" where the close icon it replaces said "leave". */}
        <Link
          href="/account/orders"
          className="flex w-fit items-center gap-x-1 txt-compact-small text-ui-fg-subtle hover:text-ui-fg-base"
          data-testid="back-to-overview-button"
        >
          <ChevronDown className="rotate-90 rtl:-rotate-90" size={16} />
          {t("backToOrders")}
        </Link>

        <Heading level="h1" className="text-2xl-semi text-ui-fg-base">
          {tc("orderNumber", { id: order.display_id ?? order.id })}
        </Heading>
        {/* The number is in the heading now, so the meta row below would only
            repeat it three lines later. */}
        <OrderDetails order={order} showStatus showOrderNumber={false} />
      </div>

      <OrderSection title={t("items")}>
        <Items order={order} />
      </OrderSection>

      <OrderSection title={to("heading")}>
        <OrderSummary order={order} />
      </OrderSection>

      <OrderSection title={ts("heading")}>
        <ShippingDetails order={order} />
      </OrderSection>

      {hasPayment && (
        <OrderSection title={tp("heading")}>
          <PaymentDetails order={order} />
        </OrderSection>
      )}

      <OrderSection title={th("needHelp")}>
        <Help />
      </OrderSection>
    </div>
  )
}

export default OrderDetailsTemplate
