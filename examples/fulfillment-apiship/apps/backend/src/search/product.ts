import type { SearchTypes } from "@medusajs/framework/types";
import {
  defineSearchIndex,
  graphConsume,
  graphSeed,
  search,
} from "@medusajs/framework/utils";

import {
  type PricedVariantRow,
  priceFields,
  toMinPrices,
} from "./helpers/prices";
import { resolveProductIds } from "./helpers/resolve-product-ids";
import { loadTranslations, withTranslations } from "./helpers/translations";

/**
 * The product index behind the storefront's catalog: the search dialog, the
 * store listing and the category and collection pages all query it through
 * `POST /store/search`, then load the products they show through the Store
 * API, which prices them for the region and translates them for the locale.
 *
 * So the index holds only what it takes to find, filter and sort products:
 * - the text, in every language the catalog is translated into
 * - IDs to filter on, never labels, since labels change with the locale
 * - the lowest base price per currency, to sort by
 */

const PRODUCT_GRAPH_FIELDS = [
  "id",
  "title",
  "description",
  "handle",
  "status",
  "created_at",
  "collection_id",
  "sales_channels.id",
  "categories.id",
  "variants.options.id",
  "variants.options.value",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "variants.prices.rules_count",
  "variants.prices.price_list_id",
];

type OptionValueRow = { id?: string | null; value?: string | null } | null;

type ProductRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  handle?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  collection_id?: string | null;
  sales_channels?: ({ id?: string | null } | null)[] | null;
  categories?: ({ id?: string | null } | null)[] | null;
  variants?:
    | ((PricedVariantRow & { options?: OptionValueRow[] | null }) | null)[]
    | null;
};

const productFields = search.define({
  // Sortable as the tiebreaker that keeps pages of equal prices or creation
  // times from overlapping.
  id: search.keyword().filterable().sortable().retrievable(),
  // Read by `/store/search` to scope the index to published products in the
  // publishable key's sales channels. Never returned to hits.
  status: search.keyword().filterable().retrievable(false),
  sales_channel_ids: search.keyword().array().filterable().retrievable(false),
  // The title and description in the source language and every translation,
  // so a query in any storefront language finds the product.
  titles: search.text().array().searchable({ weight: 3 }).retrievable(false),
  descriptions: search
    .text()
    .array()
    .searchable({ weight: 1 })
    .retrievable(false),
  // The option values the variants use, such as "Black" or "M", translated
  // too, so searching for a colour or a size works.
  option_values: search
    .keyword()
    .array()
    .searchable({ weight: 2 })
    .retrievable(false),
  // The titles and option values again, lowercased into one string, for
  // languages written without spaces between words. Full-text search splits
  // text into words at spaces, so "シャツ" would never match "Tシャツ". The
  // storefront matches those queries with `$like` on this field instead.
  substring_text: search.keyword().filterable().retrievable(false),
  handle: search.keyword().retrievable(),
  created_at: search.date().sortable().retrievable(),
  category_ids: search.keyword().array().filterable().facetable(),
  collection_id: search.keyword().filterable(),
  // Only the values some variant uses: a global option lists values a product
  // never sells.
  option_value_ids: search.keyword().array().filterable().facetable(),
  ...priceFields,
});

type ProductDocument = SearchTypes.InferSearchDocumentType<
  typeof productFields
>;

const ids = (rows: ({ id?: string | null } | null)[] | null | undefined) =>
  Array.from(
    new Set(
      (rows ?? [])
        .map((row) => row?.id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  );

function toDocument(
  product: ProductRow,
  translations: Map<string, Map<string, string[]>>,
): ProductDocument {
  const own = translations.get(product.id);
  const optionValues = (product.variants ?? []).flatMap(
    (variant) => variant?.options ?? [],
  );
  const titles = withTranslations(product.title, own?.get("title"));
  const optionLabels = Array.from(
    new Set(
      optionValues.flatMap((value) =>
        withTranslations(
          value?.value,
          value?.id ? translations.get(value.id)?.get("value") : undefined,
        ),
      ),
    ),
  );

  return {
    id: product.id,
    status: product.status ?? null,
    sales_channel_ids: ids(product.sales_channels),
    titles,
    descriptions: withTranslations(
      product.description,
      own?.get("description"),
    ),
    option_values: optionLabels,
    substring_text: [...titles, ...optionLabels].join(" | ").toLowerCase(),
    handle: product.handle ?? null,
    created_at: product.created_at ?? null,
    category_ids: ids(product.categories),
    collection_id: product.collection_id ?? null,
    option_value_ids: ids(optionValues),
    ...toMinPrices(product.variants),
  };
}

/**
 * Drafts are indexed too: `/store/search` adds `status = published` on its
 * own, and publishing a product then needs no more than the
 * `product.updated` event that comes with it. A row that returns no document
 * leaves the index.
 */
const source = {
  fields: PRODUCT_GRAPH_FIELDS,
  transform: async (
    rows: ProductRow[],
    context: SearchTypes.SearchIngestionContext,
  ) => {
    const optionValueIds = rows.flatMap((row) =>
      (row.variants ?? []).flatMap((variant) => ids(variant?.options)),
    );
    const translations = await loadTranslations(
      Array.from(new Set([...rows.map((row) => row.id), ...optionValueIds])),
      context,
    );

    return rows.map((row) => toDocument(row, translations));
  },
};

/**
 * Everything a document is built from, so a change to any of it re-indexes the
 * products it touches. Only `product.deleted` removes documents. Assigning
 * products to a category, a collection or a sales channel emits
 * `product.updated`, and so does a variant price change, as
 * `product-variant.updated`.
 */
const PRODUCT_EVENTS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "product-variant.created",
  "product-variant.updated",
  "product-variant.deleted",
  "product-option.updated",
  "product-option.deleted",
  "product-option-value.updated",
  "product-option-value.deleted",
  "product-category.deleted",
  "product-collection.deleted",
  "sales-channel.deleted",
  "translation.created",
  "translation.updated",
  "translation.deleted",
];

export default defineSearchIndex({
  name: "product",
  entity: "product",
  primary_key: "id",
  fields: productFields,
  settings: {
    typo_tolerance: { enabled: true },
  },
  events: PRODUCT_EVENTS,
  consume: graphConsume<typeof productFields, ProductRow>({
    ...source,
    resolve_ids: resolveProductIds,
    is_delete: (event) => event.name === "product.deleted",
  }),
  seed: graphSeed<typeof productFields, ProductRow>(source),
});
