import { defaultCurrencies, search } from "@medusajs/framework/utils";

/**
 * Every currency Medusa knows, so the storefront can sort by price in whatever
 * currency a region uses without anyone keeping a list in sync. A document only
 * carries the currencies its variants are priced in.
 */
export const PRICE_CURRENCIES = Object.keys(defaultCurrencies)
  .map((code) => code.toLowerCase())
  .sort();

const priceField = () =>
  search
    .float()
    .filterable()
    .sortable()
    .facetable({ types: ["stats"] })
    .retrievable();

type PriceFieldName = `min_price_${string}`;

/** One `min_price_<currency>` field per currency, to spread into the schema. */
export const priceFields = Object.fromEntries(
  PRICE_CURRENCIES.map((currency) => [`min_price_${currency}`, priceField()]),
) as Record<PriceFieldName, ReturnType<typeof priceField>>;

export type VariantPriceRow = {
  amount?: number | string | null;
  currency_code?: string | null;
  rules_count?: number | null;
  price_list_id?: string | null;
} | null;

export type PricedVariantRow = {
  prices?: VariantPriceRow[] | null;
} | null;

/**
 * The lowest price of a product's variants in each currency.
 *
 * Base prices come first: the ones with no rules and no price list, which every
 * region in that currency starts from. A currency the product is only priced in
 * through region rules, the price columns the Admin shows per region, falls
 * back to the lowest of those. Price lists are left out, so a sale doesn't
 * change the sort order. Reading the prices this way takes one query for a
 * whole page of products, where the Pricing Module would calculate one
 * currency per query.
 */
export function toMinPrices(
  variants: PricedVariantRow[] | null | undefined,
): Record<PriceFieldName, number> {
  const base = new Map<string, number>();
  const withRules = new Map<string, number>();

  const keepLowest = (
    prices: Map<string, number>,
    currency: string,
    amount: number,
  ) => {
    const current = prices.get(currency);
    if (current === undefined || amount < current) {
      prices.set(currency, amount);
    }
  };

  for (const variant of variants ?? []) {
    for (const price of variant?.prices ?? []) {
      if (!price || price.price_list_id) {
        continue;
      }

      const currency = price.currency_code?.toLowerCase();
      const amount = Number(price.amount);

      if (!currency || !Number.isFinite(amount)) {
        continue;
      }

      keepLowest(
        (price.rules_count ?? 0) > 0 ? withRules : base,
        currency,
        amount,
      );
    }
  }

  const min = new Map([...withRules, ...base]);

  return Object.fromEntries(
    Array.from(min, ([currency, amount]) => [`min_price_${currency}`, amount]),
  ) as Record<PriceFieldName, number>;
}
