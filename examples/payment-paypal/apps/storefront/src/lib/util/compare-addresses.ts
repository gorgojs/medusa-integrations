const ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "address_1",
  "company",
  "postal_code",
  "city",
  "country_code",
  "province",
  "phone",
] as const

export default function compareAddresses(address1: object, address2: object) {
  const a = address1 as Record<string, unknown> | null | undefined
  const b = address2 as Record<string, unknown> | null | undefined

  if (!a || !b) return a === b

  return ADDRESS_FIELDS.every((field) => Object.is(a[field], b[field]))
}
