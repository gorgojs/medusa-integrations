import type {
  RemoteQueryFunction,
  SearchTypes,
} from "@medusajs/framework/types";

const RESOLVE_BATCH_SIZE = 200;

// Core emits either a single `{ id }` or a batch of them.
function payloadIds(data: unknown): string[] {
  return (Array.isArray(data) ? data : [data])
    .map((entry) => (entry as { id?: string } | undefined)?.id)
    .filter((id): id is string => Boolean(id));
}

const unique = (ids: (string | null | undefined)[]) =>
  Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

/**
 * The products behind rows of another entity, read through `query.graph`.
 * Deleted rows are soft-deleted, so they're still readable with `withDeleted`,
 * which is how a deleted variant or category still leads back to its products.
 */
async function relatedProductIds(
  query: RemoteQueryFunction,
  entity: string,
  fields: string[],
  ids: string[],
  pick: (row: Record<string, any>) => (string | null | undefined)[],
  withDeleted: boolean,
): Promise<string[]> {
  const { data } = await query.graph({
    entity,
    fields,
    filters: { id: ids },
    withDeleted,
  });

  return unique((data as Record<string, any>[]).flatMap(pick));
}

/**
 * The products whose documents hold one of these values. Deleting a sales
 * channel or a collection removes its product links first, so the products can
 * no longer be found through `query.graph`, but the index still has them.
 */
async function indexedProductIds(
  query: RemoteQueryFunction,
  field: "sales_channel_ids" | "collection_id",
  values: string[],
): Promise<string[]> {
  const ids: string[] = [];
  let skip = 0;

  while (true) {
    const { search_result: result } = await query.search({
      entity: "product",
      fields: ["id"],
      filters: { [field]: { $in: values } },
      pagination: { skip, take: RESOLVE_BATCH_SIZE },
    });

    ids.push(...result.hits.map((hit) => hit.id));

    if (result.hits.length < RESOLVE_BATCH_SIZE) {
      return ids;
    }

    skip += RESOLVE_BATCH_SIZE;
  }
}

const productsOf = (row: Record<string, any>) =>
  (row.products ?? []).map((product: any) => product?.id);

/**
 * A translation is indexed through the row it translates, so its event leads
 * to the products that row belongs to.
 */
async function productIdsOfTranslations(
  query: RemoteQueryFunction,
  ids: string[],
): Promise<string[]> {
  const { data } = await query.graph({
    entity: "translation",
    fields: ["reference", "reference_id"],
    filters: { id: ids },
    withDeleted: true,
  });

  const byReference = new Map<string, string[]>();
  for (const row of data as { reference?: string; reference_id?: string }[]) {
    if (!row.reference || !row.reference_id) continue;
    byReference.set(row.reference, [
      ...(byReference.get(row.reference) ?? []),
      row.reference_id,
    ]);
  }

  const resolved = await Promise.all(
    Array.from(byReference, ([reference, referenceIds]) => {
      switch (reference) {
        case "product":
          return referenceIds;
        case "product_option":
          return relatedProductIds(
            query,
            "product_option",
            ["products.id"],
            referenceIds,
            productsOf,
            true,
          );
        case "product_option_value":
          return relatedProductIds(
            query,
            "product_option_value",
            ["option.products.id"],
            referenceIds,
            (row) => productsOf(row.option ?? {}),
            true,
          );
        default:
          return [];
      }
    }),
  );

  return unique(resolved.flat());
}

/**
 * The products an event affects. A product event carries them directly; an
 * event about a variant, option, category, collection, sales channel or
 * translation is mapped to the products behind it.
 *
 * Options are global since Medusa 2.16, so an option and its values lead to
 * every product that uses them through `products`, not a `product_id`.
 */
export async function resolveProductIds(
  event: { name: string; data: unknown },
  { container: { query } }: SearchTypes.SearchIngestionContext,
): Promise<string[]> {
  const ids = payloadIds(event.data);

  if (!ids.length) {
    return [];
  }

  const [entity] = event.name.split(".");
  const deleted = event.name.endsWith(".deleted");

  switch (entity) {
    case "product":
      return ids;
    case "product-variant":
      return relatedProductIds(
        query,
        "product_variant",
        ["product_id"],
        ids,
        (row) => [row.product_id],
        deleted,
      );
    case "product-option":
      return relatedProductIds(
        query,
        "product_option",
        ["products.id"],
        ids,
        productsOf,
        deleted,
      );
    case "product-option-value":
      return relatedProductIds(
        query,
        "product_option_value",
        ["option.products.id"],
        ids,
        (row) => productsOf(row.option ?? {}),
        deleted,
      );
    case "product-category":
      return relatedProductIds(
        query,
        "product_category",
        ["products.id"],
        ids,
        productsOf,
        deleted,
      );
    case "product-collection":
      return deleted
        ? indexedProductIds(query, "collection_id", ids)
        : relatedProductIds(
            query,
            "product_collection",
            ["products.id"],
            ids,
            productsOf,
            false,
          );
    case "sales-channel":
      return indexedProductIds(query, "sales_channel_ids", ids);
    case "translation":
      return productIdsOfTranslations(query, ids);
    default:
      return [];
  }
}
