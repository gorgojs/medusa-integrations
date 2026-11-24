import type { Metadata } from "next"

import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"
import { buildAlternates } from "@lib/util/alternates"
import { getCountryCode } from "@lib/data/cookies"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { getTranslations, getLocale } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"
import { NOINDEX_FOLLOW } from "@lib/util/robots"

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
  q?: string
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
}

const searchQuery = (q?: string | string[]) =>
  (Array.isArray(q) ? q[0] : q)?.trim() || undefined

export async function generateMetadata(props: Params): Promise<Metadata> {
  const [t, locale, searchParams] = await Promise.all([
    getTranslations("Metadata.store"),
    getLocale(),
    props.searchParams,
  ])
  return {
    title: pageTitle(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/store"),
    // Search results are a page per query, so they stay out of the index
    // while their links are still followed.
    ...(searchQuery(searchParams.q) ? { robots: NOINDEX_FOLLOW } : {}),
  }
}

export default async function StorePage(props: Params) {
  const searchParams = await props.searchParams
  const countryCode = await getCountryCode()
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const q = searchQuery(searchParams.q)

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={countryCode ?? ""}
      optionValueIds={optionValueIds}
      q={q}
    />
  )
}
