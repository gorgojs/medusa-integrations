/** The address fields of a Medusa cart this package reads. */
export type CartAddressLike = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
}

/** An address as Mollie's payment takes it (`billingAddress`, `shippingAddress`). */
export type MollieAddress = {
  givenName?: string
  familyName?: string
  organizationName?: string
  streetAndNumber: string
  streetAdditional?: string
  postalCode: string
  city: string
  region?: string
  country: string
  email?: string
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * A cart address for Mollie, or `undefined` when it lacks the street, the postal code, the city or
 * the country: Mollie rejects an incomplete address, and an address with empty strings in it, with
 * a 422. The phone is left out: Mollie wants E.164 and a Medusa cart keeps it as the buyer typed it.
 */
export function toMollieAddress(
  address: CartAddressLike | null | undefined,
  email?: string | null
): MollieAddress | undefined {
  if (!address) {
    return undefined
  }
  const streetAndNumber = text(address.address_1)
  const postalCode = text(address.postal_code)
  const city = text(address.city)
  const country = text(address.country_code)?.toUpperCase()
  if (!streetAndNumber || !postalCode || !city || !country) {
    return undefined
  }
  const result: MollieAddress = { streetAndNumber, postalCode, city, country }
  const optional = {
    givenName: text(address.first_name),
    familyName: text(address.last_name),
    organizationName: text(address.company),
    streetAdditional: text(address.address_2),
    region: text(address.province),
    email: text(email),
  }
  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      ;(result as Record<string, string>)[key] = value
    }
  }
  return result
}
