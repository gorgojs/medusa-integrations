import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import ContentPage from "@modules/common/components/content-page"
import { buildAlternates } from "@lib/util/alternates"
import { pageTitle } from "@lib/util/page-title"

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata.privacy"),
    getLocale(),
  ])

  return {
    title: pageTitle(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/privacy"),
  }
}

// The copy is a placeholder. Rewrite `Metadata.privacy` in `messages/*.json`
// with your own before you go live.
export default async function PrivacyPage() {
  const t = await getTranslations("Metadata.privacy")

  return <ContentPage title={t("title")} description={t("description")} />
}
