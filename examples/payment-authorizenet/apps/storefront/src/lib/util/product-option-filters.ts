export const OPTION_VALUE_QUERY_KEY = "optionValueIds"

export type OptionValueIds = string[]

type ReadonlySearchParams = {
  getAll: (name: string) => string[]
}

export const parseOptionValueIds = (
  searchParams:
    | ReadonlySearchParams
    | Record<string, string | string[] | undefined>
): OptionValueIds => {
  if (typeof (searchParams as ReadonlySearchParams).getAll === "function") {
    const values = (searchParams as ReadonlySearchParams).getAll(
      OPTION_VALUE_QUERY_KEY
    )

    return Array.from(new Set(values.filter(Boolean)))
  }

  const paramValue = (
    searchParams as Record<string, string | string[] | undefined>
  )[OPTION_VALUE_QUERY_KEY]

  if (Array.isArray(paramValue)) {
    return Array.from(new Set(paramValue.filter(Boolean)))
  }

  if (typeof paramValue === "string" && paramValue.length > 0) {
    return paramValue.split(",").filter(Boolean)
  }

  return []
}
