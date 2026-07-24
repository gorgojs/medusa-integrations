import type { IntegrationDescriptor } from "./define"
import type { OptionDef } from "./option"
import { optionToZod } from "./build-zod"

export type ValidationIssue = { path: string; message: string }

type WithOptions = Pick<IntegrationDescriptor, "options">
type FullValidatable = Pick<IntegrationDescriptor, "options" | "optionsSchema" | "validate">

/** Run one option's zod + its cross-field `validate` against the merged config. */
function validateOne(
  id: string,
  def: OptionDef,
  merged: Record<string, unknown>,
  push: (issue: ValidationIssue) => void
): unknown {
  const res = optionToZod(def).safeParse(merged[id])
  if (!res.success) {
    for (const i of res.error.issues) push({ path: [id, ...i.path].join(".") || id, message: i.message })
    return merged[id]
  }
  const value = res.data
  def.validate?.(value as never, {
    options: merged,
    addIssue: (issue) => push({ path: (issue.path ?? [id]).join("."), message: issue.message }),
  })
  return value
}

/**
 * Validate EXACTLY the submitted option ids against the merged config (submitted values
 * merged over the rest of the stored config, done by the caller). Cross-field `validate`
 * rules can read siblings via `ctx.options`. Built-in sections pass their section's ids;
 * a widget passes whatever option ids it manages. Unknown ids must be filtered by the
 * caller — this function only validates ids that exist in the catalog.
 */
export function validateOptions(
  descriptor: WithOptions,
  ids: readonly string[],
  merged: Record<string, unknown>
):
  | { success: true; data: Record<string, unknown> }
  | { success: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const data: Record<string, unknown> = {}
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(descriptor.options, id)) continue
    const def = descriptor.options[id]
    data[id] = validateOne(id, def, merged, (i) => issues.push(i))
  }
  if (issues.length) return { success: false, issues }
  return { success: true, data }
}

/**
 * Full (activation) validation of an assembled config: the composed schema (all options,
 * with defaults), every option's cross-field `validate`, and the descriptor's cross-section
 * `validate`. Empty array ⇒ complete.
 */
export function collectValidationIssues(
  descriptor: FullValidatable,
  full: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const parsed = descriptor.optionsSchema.safeParse(full)
  if (!parsed.success) {
    for (const i of parsed.error.issues) issues.push({ path: i.path.join("."), message: i.message })
  }
  const merged = (parsed.success ? (parsed.data as Record<string, unknown>) : full) ?? {}
  for (const [id, def] of Object.entries(descriptor.options)) {
    def.validate?.(merged[id] as never, {
      options: merged,
      addIssue: (issue) => issues.push({ path: (issue.path ?? [id]).join("."), message: issue.message }),
    })
  }
  descriptor.validate?.(merged, {
    addIssue: (issue) => issues.push({ path: (issue.path ?? []).join("."), message: issue.message }),
  })
  return issues
}

export function isDescriptorComplete(
  descriptor: FullValidatable,
  full: Record<string, unknown>
): boolean {
  return collectValidationIssues(descriptor, full).length === 0
}
