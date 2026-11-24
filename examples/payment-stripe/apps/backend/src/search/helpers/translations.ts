import type { SearchTypes } from "@medusajs/framework/types";

type TranslationRow = {
  reference?: string | null;
  reference_id?: string | null;
  translations?: Record<string, unknown> | null;
};

/**
 * The translated text of each referenced row, across every locale, keyed by
 * the row's ID and then by the translated field, such as `title`.
 *
 * One query reads the whole page, where `query.graph` with a `locale` would
 * take one per locale, 36 of them for this starter.
 */
export async function loadTranslations(
  referenceIds: string[],
  { container: { query } }: SearchTypes.SearchIngestionContext,
): Promise<Map<string, Map<string, string[]>>> {
  const byReference = new Map<string, Map<string, string[]>>();

  if (!referenceIds.length) {
    return byReference;
  }

  const { data } = await query.graph({
    entity: "translation",
    fields: ["reference", "reference_id", "translations"],
    filters: { reference_id: referenceIds },
  });

  for (const row of data as TranslationRow[]) {
    if (!row.reference_id) {
      continue;
    }

    let fields = byReference.get(row.reference_id);
    if (!fields) {
      fields = new Map();
      byReference.set(row.reference_id, fields);
    }

    for (const [field, value] of Object.entries(row.translations ?? {})) {
      if (typeof value !== "string" || !value.trim()) {
        continue;
      }

      const values = fields.get(field) ?? [];
      values.push(value.trim());
      fields.set(field, values);
    }
  }

  return byReference;
}

/** A source value and its translations, without blanks or duplicates. */
export function withTranslations(
  value: string | null | undefined,
  translated: string[] | undefined,
): string[] {
  return Array.from(
    new Set(
      [value?.trim(), ...(translated ?? [])].filter((text): text is string =>
        Boolean(text),
      ),
    ),
  );
}
