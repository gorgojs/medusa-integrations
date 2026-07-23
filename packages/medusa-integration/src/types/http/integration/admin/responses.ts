import type { DeleteResponse } from "@medusajs/framework/types"
import type { IntegrationOverviewItem, MaskedIntegration } from "./entities"
import type { CategoryKind, TestConnectionResult, UiDescriptor } from "../../../integration"

export interface AdminIntegrationListResponse {
  integrations: IntegrationOverviewItem[]
  /** Total items after filtering (pagination total). */
  count: number
  limit: number
  offset: number
  /** Distinct categories across ALL registrations (unfiltered) — drives the tab bar. */
  categories: CategoryKind[]
  /** Docs URL for the "Add Integration" button + footer link. */
  docs_url: string
}

export interface AdminIntegrationResponse {
  descriptor?: UiDescriptor
  integration: MaskedIntegration | null
  /** Whether the stored config passes full validation (all required + cross-section rules). */
  is_complete: boolean
}

export interface AdminIntegrationUpsertResponse {
  integration: MaskedIntegration
}

export interface AdminIntegrationDeleteResponse extends DeleteResponse<"integration"> {}

export interface AdminIntegrationTestResponse extends TestConnectionResult {}
