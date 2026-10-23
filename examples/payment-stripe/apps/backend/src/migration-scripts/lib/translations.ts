import type { MedusaContainer } from "@medusajs/framework";
import type { CreateTranslationDTO } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { createTranslationsWorkflow } from "@medusajs/medusa/core-flows";
import {
  SEED_LOCALES,
  SEED_LOCALE_NAMES,
  SEED_TRANSLATIONS,
  type SeedLocale,
  type SeedTranslations,
} from "../data/i18n";
import { SEED_PRODUCTS } from "../data/products";
import { logger } from "@medusajs/framework/logger";
import { getQuery, toKey } from "./utils";

export const seedTranslations = async (container: MedusaContainer) => {
  const query = getQuery(container);
  const translationModuleService = container.resolve(Modules.TRANSLATION);

  await translationModuleService.createLocales(
    SEED_LOCALES.map((code) => ({ code, name: SEED_LOCALE_NAMES[code] })),
  );

  const translations: CreateTranslationDTO[] = [];

  const clean = (fields: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(fields).filter(
        ([, value]) => value != null && value !== "",
      ),
    );

  const addTranslations = (
    reference: string,
    referenceId: string,
    byLocale: Partial<Record<SeedLocale, Record<string, unknown>>>,
  ) => {
    for (const locale of SEED_LOCALES) {
      const fields = byLocale[locale];
      if (!fields) continue;
      const cleaned = clean(fields);
      if (Object.keys(cleaned).length) {
        translations.push({
          reference,
          reference_id: referenceId,
          locale_code: locale,
          translations: cleaned,
        });
      }
    }
  };

  const translationsFor = <T>(
    getFields: (t: SeedTranslations) => T,
  ): Partial<Record<SeedLocale, T>> =>
    Object.fromEntries(
      SEED_LOCALES.map((locale) => [
        locale,
        getFields(SEED_TRANSLATIONS[locale]),
      ]),
    );

  const translateTerm = (value: string, t: SeedTranslations) =>
    t.terms[toKey(value)] ?? value;

  const { data: seededCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  });

  for (const category of seededCategories) {
    addTranslations(
      "product_category",
      category.id,
      translationsFor((t) => ({
        name: t.categories[toKey(category.handle)],
      })),
    );
  }

  const { data: seededCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  });

  for (const productCollection of seededCollections) {
    addTranslations(
      "product_collection",
      productCollection.id,
      translationsFor((t) => ({
        title: t.collections[toKey(productCollection.handle)],
      })),
    );
  }

  const { data: seededProductOptions } = await query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.id", "values.value"],
  });

  for (const option of seededProductOptions) {
    addTranslations(
      "product_option",
      option.id,
      translationsFor((t) => ({ title: translateTerm(option.title, t) })),
    );

    for (const optionValue of option.values ?? []) {
      addTranslations(
        "product_option_value",
        optionValue.id,
        translationsFor((t) => ({
          value: translateTerm(optionValue.value, t),
        })),
      );
    }
  }

  const { data: seededProducts } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "description",
      "variants.id",
      "variants.title",
    ],
    filters: {
      handle: SEED_PRODUCTS.map((product) => product.handle),
    },
  });

  for (const product of seededProducts) {
    addTranslations(
      "product",
      product.id,
      translationsFor((t) => t.products[toKey(product.handle)]),
    );

    for (const variant of product.variants ?? []) {
      const localizeTitle = (t: SeedTranslations) =>
        variant.title
          .split(" / ")
          .map((segment: string) => translateTerm(segment, t))
          .join(" / ");
      addTranslations(
        "product_variant",
        variant.id,
        translationsFor((t) => ({ title: localizeTitle(t) })),
      );
    }
  }

  const { data: seededShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "type.id",
      "type.code",
      "type.label",
      "type.description",
    ],
  });

  for (const shippingOption of seededShippingOptions) {
    const optionType = shippingOption.type;
    if (!optionType) continue;

    addTranslations(
      "shipping_option",
      shippingOption.id,
      translationsFor((t) => ({
        name: t.shippingOptions[toKey(optionType.code)],
      })),
    );

    addTranslations(
      "shipping_option_type",
      optionType.id,
      translationsFor((t) => t.shippingTypes[toKey(optionType.code)]),
    );
  }

  const { data: seededRefundReasons } = await query.graph({
    entity: "refund_reason",
    fields: ["id", "label", "description"],
  });

  for (const refundReason of seededRefundReasons) {
    addTranslations(
      "refund_reason",
      refundReason.id,
      translationsFor((t) => t.refundReasons[toKey(refundReason.label)]),
    );
  }

  logger.info(`Prepared ${translations.length} translations.`);

  await createTranslationsWorkflow(container).run({
    input: { translations },
  });
};
