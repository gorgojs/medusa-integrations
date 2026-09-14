import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle } from "@lib/data/categories"
import { buildAlternates } from "@lib/util/alternates"
import { getCountryCode } from "@lib/data/cookies"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { parseSubcategoryHandles } from "@lib/util/subcategory-filters"
import CategoryTemplate from "@modules/categories/templates"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getLocale, getTranslations } from "next-intl/server"
import { DEFAULT_REGION, SITE_NAME } from "@lib/util/env"
import { pageTitle } from "@lib/util/page-title"

type Props = {
  params: Promise<{ category: string[] }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      optionValueIds?: string | string[]
    }
  >
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const [locale, t, productCategory] = await Promise.all([
      getLocale(),
      getTranslations("Metadata.category"),
      getCategoryByHandle(params.category),
    ])
    const title = pageTitle(productCategory.name)
    const description =
      productCategory.description?.trim() ||
      t("description", {
        category: productCategory.name,
        siteName: SITE_NAME,
      })
    const categoryPath = `/categories/${params.category.join("/")}`

    return {
      title,
      description,
      alternates: buildAlternates(locale, categoryPath),
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const [params, searchParams, countryCode] = await Promise.all([
    props.params,
    props.searchParams,
    getCountryCode(),
  ])

  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const subcategoryHandles = parseSubcategoryHandles(searchParams)

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      countryCode={countryCode ?? DEFAULT_REGION}
      optionValueIds={optionValueIds}
      subcategoryHandles={subcategoryHandles}
    />
  )
}
