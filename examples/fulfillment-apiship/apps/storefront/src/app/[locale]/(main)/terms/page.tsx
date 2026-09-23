import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import ContentPage from "@modules/common/components/content-page"
import { buildAlternates } from "@lib/util/alternates"
import { pageTitle } from "@lib/util/page-title"

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata.terms"),
    getLocale(),
  ])

  return {
    title: pageTitle(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/terms"),
  }
}

// The copy is a placeholder. Rewrite `Metadata.terms` in `messages/*.json`
// with your own before you go live.
export default async function TermsPage() {
  const t = await getTranslations("Metadata.terms")

  return <ContentPage title={t("title")} description={t("description")} />
}
