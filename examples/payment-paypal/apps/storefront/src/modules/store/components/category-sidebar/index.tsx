import type { HttpTypes } from "@medusajs/types"
import { Link } from "@i18n/navigation"
import { clx } from "@medusajs/ui"

import SubcategoryFilter from "./subcategory-filter"

type CategorySidebarProps = {
  categories: HttpTypes.StoreProductCategory[]
  activeCategoryId?: string
}

const CategorySidebar = ({
  categories,
  activeCategoryId,
}: CategorySidebarProps) => {
  const topLevel = categories.filter((c) => !c.parent_category_id)
  const activeCategory = categories.find((c) => c.id === activeCategoryId)
  const childCategories = activeCategory?.category_children ?? []

  return (
    <div className="hidden flex-col lg:flex gap-5">
      <SubcategoryFilter
        subcategories={childCategories.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
        }))}
      />
      <div className="flex flex-col gap-1">
        {topLevel.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.handle}`}
            className={clx(
              "txt-compact-small text-ui-fg-base hover:text-ui-fg-base hover:bg-ui-bg-subtle rounded-md transition-colors w-full px-2 py-1",
              {
                "text-ui-fg-base font-medium bg-ui-bg-base-hover": category.id === activeCategoryId,
              }
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CategorySidebar
