import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import ContentPage from "@modules/common/components/content-page"
import { buildAlternates } from "@lib/util/alternates"
import { pageTitle } from "@lib/util/page-title"

type FaqEntry = {
  question: string
  answer: string
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata.customerService"),
    getLocale(),
  ])

  return {
    title: pageTitle(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/customer-service"),
  }
}

// The copy is a placeholder. Rewrite `Metadata.customerService` and
// `ContentPages.faq` in `messages/*.json` with your own before you go live.
export default async function CustomerServicePage() {
  const [t, tc] = await Promise.all([
    getTranslations("Metadata.customerService"),
    getTranslations("ContentPages"),
  ])
  const faq = tc.raw("faq") as FaqEntry[]

  return (
    <ContentPage title={t("title")} description={t("description")}>
      <dl className="flex flex-col gap-y-4">
        {faq.map((entry) => (
          <div key={entry.question}>
            <dt className="text-large-semi text-ui-fg-base">{entry.question}</dt>
            <dd className="text-base-regular text-ui-fg-subtle">
              {entry.answer}
            </dd>
          </div>
        ))}
      </dl>
    </ContentPage>
  )
}
