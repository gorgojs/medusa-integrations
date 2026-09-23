import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import { buildAlternates } from "@lib/util/alternates"
import { getCountryCode } from "@lib/data/cookies"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import CollectionTemplate from "@modules/collections/templates"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getLocale, getTranslations } from "next-intl/server"
import { DEFAULT_REGION, SITE_NAME } from "@lib/util/env"
import { pageTitle } from "@lib/util/page-title"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      page?: string
      sortBy?: SortOptions
      optionValueIds?: string | string[]
    }
  >
}

export const PRODUCT_LIMIT = 12

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [params, locale, t] = await Promise.all([
    props.params,
    getLocale(),
    getTranslations("Metadata.collection"),
  ])
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  return {
    title: pageTitle(collection.title),
    description: t("description", {
      collection: collection.title,
      siteName: SITE_NAME,
    }),
    alternates: buildAlternates(locale, `/collections/${params.handle}`),
  }
}

export default async function CollectionPage(props: Props) {
  const [params, searchParams, countryCode] = await Promise.all([
    props.params,
    props.searchParams,
    getCountryCode(),
  ])

  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={countryCode ?? DEFAULT_REGION}
      optionValueIds={optionValueIds}
    />
  )
}
