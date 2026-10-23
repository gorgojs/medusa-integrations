import { NextIntlClientProvider } from "next-intl"
import { getLocale } from "next-intl/server"
import HtmlDirSync from "@modules/common/components/html-dir-sync"
import JsonLd from "@modules/common/components/json-ld"
import { buildSiteJsonLd } from "@lib/util/json-ld"

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <NextIntlClientProvider>
      <JsonLd data={buildSiteJsonLd(locale)} />
      <HtmlDirSync />
      {children}
    </NextIntlClientProvider>
  )
}
