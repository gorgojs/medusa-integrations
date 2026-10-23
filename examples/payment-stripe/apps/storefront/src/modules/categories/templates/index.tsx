import { notFound } from "next/navigation"
import { Suspense } from "react"
import { getLocale, getTranslations } from "next-intl/server"

import type { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import RefinementList from "@modules/store/components/refinement-list"
import MobileRefinement from "@modules/store/components/mobile-refinement"
import CategorySidebar from "@modules/store/components/category-sidebar"
import PaginatedProducts, {
  PRODUCT_LIMIT,
} from "@modules/store/templates/paginated-products"
import { listCategories } from "@lib/data/categories"
import { listProductOptionFilters } from "@lib/data/products"
import { getCategoryAncestors } from "@lib/util/category-ancestors"
import type { HttpTypes } from "@medusajs/types"
import Breadcrumb, {
  type BreadcrumbItem,
} from "@modules/common/components/breadcrumb"
import JsonLd from "@modules/common/components/json-ld"
import { buildBreadcrumbJsonLd } from "@lib/util/json-ld"

export default async function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
  subcategoryHandles = [],
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  subcategoryHandles?: string[]
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const subcategories = category.category_children ?? []
  const selectedSubcategories = subcategories.filter((c) =>
    subcategoryHandles.includes(c.handle)
  )
  const categoryIds = selectedSubcategories.length
    ? selectedSubcategories.map((c) => c.id)
    : [category.id, ...subcategories.map((c) => c.id)]

  const [t, locale, categories, optionFilters] = await Promise.all([
    getTranslations(),
    getLocale(),
    listCategories(),
    listProductOptionFilters({ category_id: categoryIds }),
  ])

  const ancestors = getCategoryAncestors(category)

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t("Breadcrumb.home"), href: "/" },
    { label: t("Breadcrumb.store"), href: "/store" },
    ...ancestors.map((ancestor) => ({
      label: ancestor.name,
      href: `/categories/${ancestor.handle}`,
    })),
    selectedSubcategories.length > 0
      ? { label: category.name, href: `/categories/${category.handle}` }
      : { label: category.name },
    ...(selectedSubcategories.length > 0
      ? [{ label: selectedSubcategories.map((c) => c.name).join(", ") }]
      : []),
  ]

  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    crumbs: breadcrumbItems,
    locale,
    path: `/categories/${category.handle}`,
  })

  return (
    <div
      className="flex flex-col py-6 content-container"
      data-testid="category-container"
    >
      {breadcrumbJsonLd && <JsonLd data={breadcrumbJsonLd} />}

      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-8 lg:grid lg:grid-cols-[280px_1fr] lg:items-center">
        <div className="flex items-center justify-between">
          <h1 className="h3-webs" data-testid="category-page-title">
            {category.name}
          </h1>
          <MobileRefinement
            sortBy={sort}
            optionFilters={optionFilters}
            className="lg:hidden text-ui-fg-base hover:text-ui-fg-subtle transition-colors"
          />
        </div>
        <div className="mt-4 hidden lg:mt-0 lg:flex lg:flex-row lg:items-center lg:justify-between">
          <RefinementList
            sortBy={sort}
            display="filters"
            optionFilters={optionFilters}
          />
          <RefinementList
            sortBy={sort}
            display="sort"
            data-testid="sort-by-container"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[248px_1fr] gap-8">
        <CategorySidebar
          categories={categories}
          activeCategoryId={category.id}
        />
        <div className="w-full">
          {category.description && (
            <div className="mb-8 text-base-regular">
              <p>{category.description}</p>
            </div>
          )}
          <Suspense
            fallback={
              <SkeletonProductGrid
                numberOfProducts={category.products?.length || PRODUCT_LIMIT}
              />
            }
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              categoryIds={categoryIds}
              countryCode={countryCode}
              optionValueIds={optionValueIds}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
