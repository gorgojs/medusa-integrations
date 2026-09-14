import { acceptTransferRequest } from "@lib/data/orders"
import { Heading, Text } from "@medusajs/ui"
import TransferImage from "@modules/order/components/transfer-image"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"
import { NOINDEX } from "@lib/util/robots"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.orderTransfer")

  return {
    title: pageTitle(t("title")),
    robots: NOINDEX,
  }
}

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>
}) {
  const { id, token } = await params
  const t = await getTranslations("TransferPage")

  const { success } = await acceptTransferRequest(id, token)

  return (
    <div className="flex flex-col gap-y-6 items-start w-full max-w-xl mx-auto px-4 py-12 md:py-16">
      <TransferImage />
      <div className="flex flex-col gap-y-3 w-full min-w-0">
        {success ? (
          <>
            <Heading level="h1" className="!text-lg text-zinc-900">
              {t("acceptedHeading")}
            </Heading>
            <Text className="!text-sm text-zinc-600 break-words">
              {t("acceptedBody", { id })}
            </Text>
          </>
        ) : (
          <Text className="!text-sm text-zinc-600">{t("acceptError")}</Text>
        )}
      </div>
    </div>
  )
}
