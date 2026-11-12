/**
 * Integration category — which Medusa module a provider configures.
 *
 * Values are added in minor releases and removed or renamed only in major ones, so handle a value
 * you don't know. A new category also ships a migration, because the database checks the stored
 * value against this list.
 */
export const IntegrationCategory = {
  PAYMENT: "payment",
  NOTIFICATION: "notification",
  FULFILLMENT: "fulfillment",
  SEARCH: "search",
  CONTENT: "content",
  ANALYTICS: "analytics",
  AUTHENTICATION: "authentication",
  ERP: "erp",
  CRM: "crm",
  PIM: "pim",
  MARKETPLACE: "marketplace",
  FEED: "feed",
  FILE_PROVIDERS: "file_providers",
  TAX: "tax",
  SUBSCRIPTIONS: "subscriptions",
  REVIEWS: "reviews",
  ADMIN: "admin",
  OTHER: "other",
} as const
export type CategoryKind = (typeof IntegrationCategory)[keyof typeof IntegrationCategory]

/**
 * Outcome of a provider's connection test.
 *
 * Values are added in minor releases and removed or renamed only in major ones, so handle a value
 * you don't know. A new status also ships a migration, because the database checks the stored
 * value against this list.
 */
export const IntegrationTestStatus = {
  PASSED: "passed",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const
export type TestStatus = (typeof IntegrationTestStatus)[keyof typeof IntegrationTestStatus]
