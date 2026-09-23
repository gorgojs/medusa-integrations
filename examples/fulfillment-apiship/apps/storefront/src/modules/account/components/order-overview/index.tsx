"use client"

import { Button } from "@medusajs/ui"

import OrderCard from "../order-card"
import { Link } from "@i18n/navigation"
import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const t = useTranslations("OrderOverview")

  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-4 w-full">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center gap-y-4"
      data-testid="no-orders-container"
    >
      <h2 className="text-large-semi text-ui-fg-base">{t("nothingToSeeHere")}</h2>
      <p className="txt-medium text-ui-fg-subtle">{t("noOrdersYet")}</p>
      <div className="mt-4">
        <Link href="/">
          <Button data-testid="continue-shopping-button">
            {t("continueShopping")}
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default OrderOverview
