/**
 * Medusa stores an unset address field as `null` or as an empty string, and
 * both used to reach the page: a template literal turned a missing phone into
 * the text "null", and a fixed `${postal_code}, ${city}` left a leading comma
 * behind whenever the postal code was blank. Everything that prints an address
 * goes through here so a missing field disappears instead.
 */

type AddressLike = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  postal_code?: string | null
  city?: string | null
  province?: string | null
  country_code?: string | null
  phone?: string | null
}

/** Joins the parts that carry text, so a blank one leaves no separator behind. */
export function joinFilled(
  parts: Array<string | null | undefined>,
  separator = ", "
): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(separator)
}

/**
 * Returns the address as the lines a reader expects, dropping any line whose
 * fields are all empty. Pass `countryLabel` to print the country by name;
 * without it the ISO code is uppercased.
 */
export function formatAddressLines(
  address?: AddressLike | null,
  countryLabel?: string
): string[] {
  if (!address) {
    return []
  }

  return [
    joinFilled([address.first_name, address.last_name], " "),
    address.company ?? "",
    joinFilled([address.address_1, address.address_2]),
    joinFilled([address.postal_code, address.city]),
    joinFilled([
      address.province,
      countryLabel || address.country_code?.toUpperCase(),
    ]),
  ].filter(Boolean)
}
