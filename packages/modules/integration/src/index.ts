// ── For integration-provider authors ─────────────────────────────────────────
export { defineIntegration, z } from "./modules/integration/descriptor/define"
export {
  AbstractIntegrationProviderService,
  AbstractIntegrationProvider,
} from "./modules/integration/utils/abstract-integration-provider"
export type {
  IntegrationDescriptor,
  IntegrationDescriptorInput,
  IntegrationSection,
  IntegrationValidateContext,
  IntegrationValidateIssue,
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
// The layouts a descriptor can prefer. Exported so a provider's inferred descriptor type can be named.
export type { IntegrationLayouts } from "./types"

// Runtime options resolver — for providers reading their config from this module.
export { resolveIntegrationOptions } from "./lib/resolve-integration-options"
export type { ResolveIntegrationOptionsInput } from "./lib/resolve-integration-options"
export {
  getResolvedIntegrationOptionsWorkflow,
  getResolvedIntegrationOptionsStep,
} from "./workflows/integration"
export type {
  GetResolvedIntegrationOptionsWorkflowInput,
  GetResolvedIntegrationOptionsStepInput,
} from "./workflows/integration"

export {
  upsertIntegrationWorkflow,
  deleteIntegrationWorkflow,
  setIntegrationEnabledWorkflow,
  testIntegrationConnectionWorkflow,
} from "./workflows/integration"
export type {
  UpsertIntegrationWorkflowInput,
  DeleteIntegrationWorkflowInput,
  SetIntegrationEnabledWorkflowInput,
  TestIntegrationConnectionWorkflowInput,
} from "./workflows/integration"

// The `provider_id` convention (`int_<identifier>_<instanceId>`, `default` for a registration without
// an `id`) — for providers that receive a provider_id on their own routes and need to build or parse one.
export {
  DEFAULT_INSTANCE_ID,
  integrationProviderKey,
  parseIntegrationProviderKey,
} from "./modules/integration/utils"
export type { ParsedIntegrationProviderKey } from "./modules/integration/utils"

// ── For consumers of the integration module ──────────────────────────────────
export { INTEGRATION_MODULE } from "./modules/integration"
export { default as IntegrationModuleService } from "./modules/integration/services/integration-module"
export type {
  ResolvedOptions,
  IntegrationOverviewQuery,
  IntegrationOverviewResult,
} from "./modules/integration/services/integration-module"
export type { IntegrationModuleOptions, LicenseStateEntry } from "./modules/integration/types"
// The records the generated methods of the service return.
export type { Integration, IntegrationChange } from "./types/integration/models"
// Shapes the service's own methods return, the same ones the Admin API sends.
export type { UiDescriptor, UiSection, UiField, IntegrationOverviewItem, CatalogItem } from "./types"

// Settings change history: rows live in the integration module (`listIntegrationChanges`, …).
export type {
  DiffEntry,
  IntegrationChangeActor,
  IntegrationChangeField,
  IntegrationChangeType,
  IntegrationChangeUser,
  RecordIntegrationChangeInput,
} from "./types/integration/history"
