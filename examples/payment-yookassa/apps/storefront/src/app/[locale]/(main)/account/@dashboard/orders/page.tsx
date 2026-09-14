import type { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"
import AccountPageHeader from "@modules/account/components/account-page-header"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.orders")

  return {
    title: pageTitle(t("title")),
    description: t("description"),
  }
}

export default async function Orders() {
  const orders = await listOrders()
  const t = await getTranslations("OrdersPage")

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <AccountPageHeader heading={t("heading")} description={t("description")} />
      <div>
        {/* An account with no orders is usually one that checked out as a guest
            before signing up, so the claim form leads instead of sitting under
            an empty list. */}
        {orders.length > 0 ? (
          <>
            <OrderOverview orders={orders} />
            <Divider className="mb-8 mt-8" />
            <TransferRequestForm />
          </>
        ) : (
          <>
            <TransferRequestForm />
            <Divider className="mb-8 mt-8" />
            <OrderOverview orders={orders} />
          </>
        )}
      </div>
    </div>
  )
}
