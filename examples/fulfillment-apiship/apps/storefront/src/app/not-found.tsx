import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound")

  return {
    title: pageTitle(t("title")),
    description: t("description"),
  }
}

export default async function NotFound() {
  const t = await getTranslations("NotFound")

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">{t("title")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {t("description")}
      </p>
      <Link className="flex gap-x-1 items-center group" href="/">
        <Text className="text-ui-fg-interactive">{t("goHome")}</Text>
        <ArrowUpRightMini
          className="group-hover:rotate-45 rtl:-scale-x-100 ease-in-out duration-150"
          color="var(--fg-interactive)"
        />
      </Link>
    </div>
  )
}
