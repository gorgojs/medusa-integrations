import { Drawer, Button, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"
import { IntegrationField } from "./field"
import { isFieldVisible } from "./visibility"
import type { UiSection } from "../../../types"

/** Pre-fill the form: current non-secret values, secrets always blank (blank = keep). */
function sectionDefaults(
  section: UiSection,
  values: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of section.fields) {
    // Precedence for every field: stored value → descriptor default → empty. Secrets stay blank
    // (blank = keep existing; a secret's default is never sent to the client anyway). A readonly
    // field seeds the same way — it's merely rendered disabled — so its `default` shows and persists.
    if (f.secret || f.control === "secret") out[f.name] = ""
    else if (f.control === "switch") out[f.name] = values?.[f.name] ?? f.default ?? false
    else if (f.control === "json") out[f.name] = values?.[f.name] ?? f.default // stored, else default object/array
    else out[f.name] = values?.[f.name] ?? f.default ?? ""
  }
  return out
}

/**
 * Edit one descriptor section in a Drawer (Medusa's convention for editing existing
 * entities). Reuses {@link IntegrationField} for inputs and persists through the same
 * upsert endpoint the page already uses.
 */
export const EditSectionDrawer = ({
  open,
  onOpenChange,
  providerId,
  section,
  values,
  configuredSecrets = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  section: UiSection
  /**
   * The full stored non-secret config (all sections). `sectionDefaults` narrows it to this
   * section for pre-fill; the whole map is also used to resolve cross-section `visibleWhen`.
   */
  values: Record<string, unknown>
  /** Secret option keys that already have a stored value — per field, so each secret shows
   * "leave blank to keep" (and skips client-side required) only when it's actually set. */
  configuredSecrets?: string[]
}) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const configured = new Set(configuredSecrets)
  // Snapshot the section's values once at mount (lazy initializer → computed a single time).
  // The drawer remounts per open (the page conditionally renders it keyed by section), so
  // each open re-snapshots the latest stored values; meanwhile a background refetch of the
  // page query keeps a stable reference here and won't reset the user's in-progress edits.
  const [defaults] = useState(() => sectionDefaults(section, values))
  const form = useForm<Record<string, unknown>>({ values: defaults })
  // Re-renders on any field change so `visibleWhen` rules re-evaluate live.
  const current = form.watch()
  // `visibleWhen` may reference a field in another section (e.g. show `ffdVersion` when
  // `capture` is on). The form only holds THIS section's fields, so evaluate against the
  // full stored config overlaid with this section's live edits — cross-section references
  // resolve from the stored value; same-section ones stay reactive as the user types.
  const visibilityValues = { ...values, ...current }

  const save = useMutation({
    mutationFn: (sectionValues: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/integrations/${providerId}`, {
        method: "POST",
        // Only this section's values + its id — the server validates just this section and
        // merges over the rest of the stored config (keeping blank/untouched secrets).
        body: { section_id: section.id, values: sectionValues },
      }),
    onSuccess: () => {
      toast.success(t("integration.toast.saved"))
      qc.invalidateQueries({ queryKey: ["integration", providerId] })
      qc.invalidateQueries({ queryKey: ["integration-overview"] })
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.toast.saveFailed")),
  })

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t(section.title)}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto">
          {section.fields
            .filter((f) => isFieldVisible(f, visibilityValues))
            .map((f) => (
              <IntegrationField
                key={f.name}
                field={f}
                control={form.control}
                secretConfigured={configured.has(f.name)}
              />
            ))}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button size="small" variant="secondary" disabled={save.isPending}>
              {t("integration.actions.cancel")}
            </Button>
          </Drawer.Close>
          <Button
            size="small"
            isLoading={save.isPending}
            onClick={form.handleSubmit((v) => save.mutate(v))}
          >
            {t("integration.actions.save")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
