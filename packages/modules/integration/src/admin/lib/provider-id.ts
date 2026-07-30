const CATEGORY_MODULE_PREFIX: Record<string, string> = {
  payment: "pp",
  fulfillment: "fp",
  tax: "tp",
}

/** Display the Medusa module provider id for an integration, or the id as-is when not a provider. */
export const toModuleProviderId = (providerId: string, category?: string | null): string => {
  const prefix = category ? CATEGORY_MODULE_PREFIX[category] : undefined
  return prefix ? providerId.replace(/^int_/, `${prefix}_`) : providerId
}
