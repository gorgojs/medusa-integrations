/**
 * Money and quantity fields come out of `query.graph` as Medusa `BigNumber`
 * instances rather than plain numbers, on orders, line items, payments and
 * anything else with a monetary column.
 *
 * Arithmetic and `Intl.NumberFormat` both coerce a `BigNumber` through its
 * `valueOf`, so they work by accident. React does not, and rendering one as a
 * child throws "Objects are not valid as a React child (found: object with keys
 * {numeric_, raw_, bignumber_})". In an email subscriber that takes down the
 * whole notification.
 *
 * Put every such value through `toNumber` before printing or formatting it.
 */
export type NumericValue = number | { valueOf(): number };

export function toNumber(value: NumericValue | null | undefined): number;
export function toNumber(
  value: NumericValue | null | undefined,
  fallback: number,
): number;
export function toNumber(
  value: NumericValue | null | undefined,
  fallback = 0,
): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
