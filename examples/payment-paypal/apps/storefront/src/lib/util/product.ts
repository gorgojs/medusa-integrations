import type { HttpTypes } from "@medusajs/types";
import { sortOptionValues } from "@lib/util/color-option";

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
  return (product.variants?.length ?? 0) <= 1;
};

export const optionsWithUsedValues = (
  product: HttpTypes.StoreProduct
): HttpTypes.StoreProductOption[] => {
  const usedByOption = new Map<string, Set<string>>();

  for (const variant of product.variants ?? []) {
    for (const optionValue of variant.options ?? []) {
      const optionId = optionValue.option_id;
      if (!optionId || optionValue.id == null) continue;
      if (!usedByOption.has(optionId)) {
        usedByOption.set(optionId, new Set());
      }
      usedByOption.get(optionId)!.add(optionValue.id);
    }
  }

  return (product.options ?? []).map((option) => {
    const used = usedByOption.get(option.id);
    const values = used
      ? (option.values ?? []).filter((value) => used.has(value.id))
      : (option.values ?? []);
    return { ...option, values: sortOptionValues(values) };
  });
};
