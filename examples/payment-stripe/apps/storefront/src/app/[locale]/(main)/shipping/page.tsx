import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import ContentPage from "@modules/common/components/content-page"
import { buildAlternates } from "@lib/util/alternates"
import { pageTitle } from "@lib/util/page-title"

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata.shipping"),
    getLocale(),
  ])

  return {
    title: pageTitle(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/shipping"),
  }
}

// The copy is a placeholder. Rewrite `Metadata.shipping` in `messages/*.json`
// with your own before you go live.
export default async function ShippingPage() {
  const t = await getTranslations("Metadata.shipping")

  return <ContentPage title={t("title")} description={t("description")} />
}
