import type { UiField } from "../../../types"

/**
 * Whether a field should be shown, given the current sibling values. A field with no
 * `visibleWhen` is always visible; otherwise it is shown only when the referenced field's
 * value strictly equals the rule's `equals`. UI-only — server validation is unaffected.
 */
export function isFieldVisible(
  field: Pick<UiField, "visibleWhen">,
  values: Record<string, unknown>
): boolean {
  const rule = field.visibleWhen
  if (!rule) return true
  return values[rule.field] === rule.equals
}
