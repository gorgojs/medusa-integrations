// ── For integration-provider authors ─────────────────────────────────────────
export { defineIntegration, z } from "./modules/integration/descriptor/define"
export { AbstractIntegrationProvider } from "./modules/integration/utils/abstract-integration-provider"
export type {
  IntegrationDescriptor,
  IntegrationDescriptorInput,
  CategoryKind,
  OptionDef,
  OptionValidateContext,
  Settings,
  TestConnectionContext,
  TestConnectionResult,
} from "./modules/integration/descriptor/define"
export type { FieldControl, I18nKey } from "./modules/integration/descriptor/meta"
// The "validate my descriptor" API — for provider authors and their unit tests.
export { collectValidationIssues, isDescriptorComplete } from "./modules/integration/descriptor/validate"
// Props a provider's custom-section admin widget receives via the settings page's LayoutComposer.
export type { IntegrationSectionData } from "./types"

// ── For consumers of the integration module ──────────────────────────────────
export { INTEGRATION_MODULE } from "./modules/integration"
export { default as IntegrationModuleService } from "./modules/integration/services/integration-module"
export type { ResolvedOptions } from "./modules/integration/services/integration-module"
export type { IntegrationModuleOptions } from "./modules/integration/types"
