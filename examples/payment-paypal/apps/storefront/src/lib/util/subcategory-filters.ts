export const SUBCATEGORY_QUERY_KEY = "subcategory"

type ReadonlySearchParams = {
  getAll: (name: string) => string[]
}

export const parseSubcategoryHandles = (
  searchParams:
    | ReadonlySearchParams
    | Record<string, string | string[] | undefined>
): string[] => {
  if (typeof (searchParams as ReadonlySearchParams).getAll === "function") {
    const values = (searchParams as ReadonlySearchParams).getAll(
      SUBCATEGORY_QUERY_KEY
    )

    return Array.from(new Set(values.filter(Boolean)))
  }

  const paramValue = (
    searchParams as Record<string, string | string[] | undefined>
  )[SUBCATEGORY_QUERY_KEY]

  if (Array.isArray(paramValue)) {
    return Array.from(new Set(paramValue.filter(Boolean)))
  }

  if (typeof paramValue === "string" && paramValue.length > 0) {
    return paramValue.split(",").filter(Boolean)
  }

  return []
}
