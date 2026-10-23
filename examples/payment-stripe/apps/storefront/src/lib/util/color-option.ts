import type { HttpTypes } from "@medusajs/types"

export const getOptionValueHex = (
  value: Pick<HttpTypes.StoreProductOptionValue, "metadata">
): string | undefined => {
  const hex = value.metadata?.hex
  return typeof hex === "string" ? hex : undefined
}

export const isColorOption = (
  option: Pick<HttpTypes.StoreProductOption, "values">
): boolean => (option.values ?? []).some((v) => getOptionValueHex(v) !== undefined)

export const getOptionValueRank = (
  value: Pick<HttpTypes.StoreProductOptionValue, "rank">
): number | undefined =>
  typeof value.rank === "number" ? value.rank : undefined

export const sortOptionValues = <
  T extends Pick<HttpTypes.StoreProductOptionValue, "rank">,
>(
  values: readonly T[]
): T[] => {
  const ranks = values.map(getOptionValueRank)
  // A catalog that does not rank its values keeps whatever order the API sent,
  // so partial ranking never reshuffles the rest.
  if (ranks.some((rank) => rank === undefined)) return [...values]
  return values
    .map((value, index) => ({ value, rank: ranks[index] as number }))
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.value)
}

export const sortByRank = <T extends { rank?: number }>(entries: T[]): T[] => {
  if (entries.some((entry) => entry.rank === undefined)) return entries
  return [...entries].sort((a, b) => (a.rank as number) - (b.rank as number))
}
