import { z } from "@medusajs/deps/zod"
import type { I18nKey } from "./meta"
import type { OptionDef, Settings } from "./option"
import { optionToZod } from "./build-zod"
import type { IntegrationLayouts, CategoryKind, TestConnectionContext, TestConnectionResult } from "../../../types"

export { z }
export type { CategoryKind, TestConnectionContext, TestConnectionResult }
export type { OptionDef, OptionValidateContext, OptionValue, Settings } from "./option"

/** One configuration section — references options by id from the descriptor's catalog. */
export type IntegrationSection = {
  id: string
  /** i18n key for the section title (resolved admin-side). */
  title: I18nKey
  /** Ordered option ids drawn into this section's auto-generated card/drawer. */
  options: readonly string[]
  /** Which column to render this section in (two-column layout). Defaults to `"main"`. */
  column?: "main" | "side"
}

/** Issue raised by the cross-section `validate` rule. */
export type IntegrationValidateIssue = { path?: (string | number)[]; message: string }
export type IntegrationValidateContext = { addIssue: (issue: IntegrationValidateIssue) => void }

type DescriptorBase = {
  /** Category — which Medusa module this integration configures (payment, fulfillment, …). */
  category: CategoryKind
  displayName: I18nKey
  description?: I18nKey
  icon?: string
  docsUrl?: string
  supportsMultipleInstances?: boolean
  preferredLayoutId?: IntegrationLayouts
}

type CrossSectionRules = {
  /**
   * Rules that span MORE THAN ONE section. Evaluated only during full (activation)
   * validation, against the assembled config. Intra-option rules belong on that option's
   * own `validate` so they also run when the option is saved.
   */
  validate?: (full: Record<string, unknown>, ctx: IntegrationValidateContext) => void
}

/** What `defineIntegration` returns (and what a provider's `descriptor` getter returns). */
export type IntegrationDescriptorInput = DescriptorBase &
  CrossSectionRules & {
    /** Flat catalog: single source of truth for every option (type/validation/UI/secret). */
    options: Record<string, OptionDef>
    /** Composed from `options` by `defineIntegration` — for `z.infer`, defaults, full validation. */
    optionsSchema: z.ZodType<any>
    sections: readonly IntegrationSection[]
    /** Optional connection check; runs against the resolved options. Omit if unsupported. */
    testConnection?(ctx: TestConnectionContext): Promise<TestConnectionResult>
  }

export type IntegrationDescriptor = IntegrationDescriptorInput & {
  /** Stamped by the registry from the provider's `static identifier`. */
  identifier: string
  /** Stamped from the registration id (null = single/default instance). */
  instanceId?: string | null
}

/**
 * Declare an integration's configuration as a flat option catalog plus sections that
 * reference option ids. The composed `optionsSchema` (for `z.infer` + defaults + full
 * validation) is built automatically:
 *
 *   const descriptor = defineIntegration({ category, displayName, options: {...}, sections: [...] })
 *   type Settings = z.infer<typeof descriptor.optionsSchema>
 */
export function defineIntegration<const O extends Record<string, OptionDef>>(
  input: DescriptorBase &
    CrossSectionRules & {
      options: O
      sections: readonly IntegrationSection[]
      /** Connection check with fully-typed, resolved options. */
      testConnection?(ctx: { options: Settings<O> }): Promise<TestConnectionResult>
    }
): DescriptorBase &
  CrossSectionRules & {
    options: O
    optionsSchema: z.ZodType<Settings<O>>
    sections: readonly IntegrationSection[]
    testConnection?(ctx: TestConnectionContext): Promise<TestConnectionResult>
  } {
  // Fail fast: every section option id must exist in the catalog.
  for (const section of input.sections) {
    for (const id of section.options) {
      if (!Object.prototype.hasOwnProperty.call(input.options, id)) {
        throw new Error(`Section "${section.id}" references unknown option "${id}"`)
      }
    }
  }
  const shape: Record<string, z.ZodType> = {}
  for (const [id, def] of Object.entries(input.options)) shape[id] = optionToZod(def)
  const optionsSchema = z.object(shape) as unknown as z.ZodType<Settings<O>>
  return { ...input, optionsSchema }
}
