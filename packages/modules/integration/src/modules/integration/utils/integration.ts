/** Integration category — which Medusa module a provider configures. */
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
  OTHER: "other",
} as const
export type CategoryKind = (typeof IntegrationCategory)[keyof typeof IntegrationCategory]

/** Outcome of a provider's connection test. */
export const IntegrationTestStatus = {
  PASSED: "passed",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const
export type TestStatus = (typeof IntegrationTestStatus)[keyof typeof IntegrationTestStatus]
