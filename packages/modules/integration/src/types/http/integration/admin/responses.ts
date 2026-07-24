import type { DeleteResponse } from "@medusajs/framework/types"
import type { CatalogItem, IntegrationOverviewItem, MaskedIntegration } from "./entities"
import type { CategoryKind, TestConnectionResult, UiDescriptor } from "../../../integration"

export interface AdminIntegrationListResponse {
  integrations: IntegrationOverviewItem[]
  /** Total items after filtering (pagination total). */
  count: number
  limit: number
  offset: number
  /** Distinct categories across ALL registrations (unfiltered) — drives the tab bar. */
  categories: CategoryKind[]
}

export interface AdminIntegrationResponse {
  descriptor?: UiDescriptor
  integration: MaskedIntegration | null
  /** Whether the stored config passes full validation (all required + cross-section rules). */
  is_complete: boolean
  /** Plugin package version (from package.json), or null if unresolved. */
  version: string | null
  /** Plugin author name (package.json author, else npm-scope-derived), or null. */
  author: string | null
  /** Author link (package.json author.url / homepage), or null. */
  author_url: string | null
}

export interface AdminIntegrationUpsertResponse {
  integration: MaskedIntegration
}

export interface AdminIntegrationDeleteResponse extends DeleteResponse<"integration"> {}

export interface AdminIntegrationTestResponse extends TestConnectionResult {}

export interface AdminIntegrationCatalogResponse {
  integrations: CatalogItem[]
}
