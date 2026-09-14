import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import type { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import RefinementList from "@modules/store/components/refinement-list"
import MobileRefinement from "@modules/store/components/mobile-refinement"
import CategorySidebar from "@modules/store/components/category-sidebar"
import { listCategories } from "@lib/data/categories"
import { listProductOptionFilters } from "@lib/data/products"

import PaginatedProducts from "./paginated-products"
import Breadcrumb from "@modules/common/components/breadcrumb"


const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const [t, categories, optionFilters] = await Promise.all([
    getTranslations(),
    listCategories(),
    listProductOptionFilters(),
  ])

  return (
    <div
      className="flex flex-col py-6 content-container"
      data-testid="category-container"
    >
      <Breadcrumb
        items={[
          { label: t("Breadcrumb.home"), href: "/" },
          { label: t("Breadcrumb.store") }
        ]}
      />

      <div className="mb-8 lg:grid lg:grid-cols-[280px_1fr] lg:items-center">
        <div className="flex items-center justify-between">
          <h1 className="h3-webs" data-testid="store-page-title">
            {t("Store.allProducts")}
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
        <CategorySidebar categories={categories} />
        <div className="w-full">
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
              optionValueIds={optionValueIds}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
