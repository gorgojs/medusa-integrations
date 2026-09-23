import type { Metadata } from "next"

import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"
import { buildAlternates } from "@lib/util/alternates"
import { getCountryCode } from "@lib/data/cookies"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { getTranslations, getLocale } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata.store"),
    getLocale(),
  ])
  return {
    title: pageTitle(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/store"),
  }
}

export default async function StorePage(props: Params) {
  const searchParams = await props.searchParams
  const countryCode = await getCountryCode()
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={countryCode ?? ""}
      optionValueIds={optionValueIds}
    />
  )
}
