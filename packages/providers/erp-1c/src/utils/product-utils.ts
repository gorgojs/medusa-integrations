import { CreateProductOptionDTO } from "@medusajs/framework/types";
import {
  Product,
  ClassifierProperty,
  ClassifierGroup,
} from "commerceml-parser-core";

type DefaultAttributes = {
  height?: number | undefined;
  width?: number | undefined;
  length?: number | undefined;
  weight?: number | undefined;
  mid_code?: string | undefined;
  hs_code?: string | undefined;
  origin_country?: string | undefined;
};
type DictionaryValues = Record<string, string>;
type OtherOptions = Record<string, string>;

export function parseDictionaryOptions(
  options: ClassifierProperty[],
  attributeMappings?: DefaultAttributes | null,
): CreateProductOptionDTO[] {
  return options
    .filter(
      (opt) =>
        opt.type === "Справочник" &&
        opt.dictionaryValues?.length &&
        !Object.values(attributeMappings ?? {}).includes(opt.id),
    )
    .map((opt) => ({
      title: opt.name,
      values: opt.dictionaryValues!.map((dv) => dv.value),
    }));
}

export function parseProductOptions(
  product: Product,
  options: ClassifierProperty[],
  attributeMappings?: DefaultAttributes | null,
): [DefaultAttributes, DictionaryValues, OtherOptions] {
  const optionMap = new Map<string, ClassifierProperty>();
  options.forEach((opt) => optionMap.set(opt.id, opt));

  const defaultAttrs: DefaultAttributes = {};
  const dictValues: DictionaryValues = {};
  const otherOptions: OtherOptions = {};

  for (const prop of product.propertyValues ?? []) {
    const option = optionMap.get(prop.id);
    if (!option) continue;

    const rawValue = prop.values?.[0];
    if (!rawValue) continue;

    const isDefault = Object.entries(attributeMappings ?? {}).find(
      ([, id]) => id === prop.id,
    );

    if (isDefault) {
      const key = isDefault[0] as keyof DefaultAttributes;

      if (option.type === "Число") {
        const numValue = parseFloat(rawValue.replace(",", "."));
        // @ts-expect-error
        if (!isNaN(numValue)) defaultAttrs[key] = numValue;
      } else if (option.type === "Строка") {
        // @ts-expect-error
        defaultAttrs[key] = rawValue;
      } else if (
        option.type === "Справочник" &&
        option.dictionaryValues
      ) {
        const dictItem = option.dictionaryValues.find(
          (d) => d.id === rawValue,
        );
        // @ts-expect-error
        if (dictItem) defaultAttrs[key] = dictItem.value;
      }

      continue;
    }

    if (option.type === "Справочник" && option.dictionaryValues) {
      const dictItem = option.dictionaryValues.find(
        (d) => d.id === rawValue,
      );
      if (dictItem) {
        dictValues[option.name] = dictItem.value;
        continue;
      }
    }

    otherOptions[option.name] = rawValue;
  }

  return [defaultAttrs, dictValues, otherOptions];
}

export function flattenClassifierGroups(
  groups: ClassifierGroup[],
): ClassifierGroup[] {
  const flatList: ClassifierGroup[] = [];

  function traverse(currentGroups: ClassifierGroup[]) {
    for (const group of currentGroups) {
      flatList.push(group);
      if (group.groups && group.groups.length > 0) {
        traverse(group.groups);
      }
    }
  }

  traverse(groups);
  return flatList;
}
