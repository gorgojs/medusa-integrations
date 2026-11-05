import type { HttpTypes } from "@medusajs/types"

export const getCategoryAncestors = (
  category: HttpTypes.StoreProductCategory
): HttpTypes.StoreProductCategory[] => {
  const ancestors: HttpTypes.StoreProductCategory[] = []
  let current = category.parent_category

  while (current) {
    ancestors.push(current)
    current = current.parent_category
  }

  return ancestors.reverse()
}
