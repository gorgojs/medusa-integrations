import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Label, Input, Button, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type { IntegrationSectionData } from "@gorgo/medusa-integration"
import { sdk } from "../lib/sdk"

/**
 * EXAMPLE: a widget that SAVES a descriptor option — the capability the flat option catalog
 * unlocks. `webhookUrl` is declared in the T-Kassa descriptor's `options` catalog but placed
 * in NO section, so the integration page renders no auto-card for it; this widget owns its UI.
 *
 * It POSTs to the same upsert endpoint the built-in section drawer uses, but WITHOUT a
 * `section_id`. The server then treats the request as "widget-owned": it keeps only the
 * submitted keys that are declared options (dropping anything else), runs each option's
 * validation — including this option's `validate` (must start with https://) — merges over the
 * stored config, splits secrets, and persists. The value is then resolvable via
 * `getResolvedOptions("tkassa").options.webhookUrl` like any other option.
 */
const WebhookUrlEditor = ({ data }: { data: IntegrationSectionData }) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { providerId, values } = data
  const [value, setValue] = useState<string>((values.webhookUrl as string) ?? "")

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/integrations/${providerId}`, {
        method: "POST",
        // No `section_id`: the server validates exactly the option ids submitted here.
        body: { values: { webhookUrl: value } },
      }),
    onSuccess: () => {
      toast.success(t("tkassa.webhookUrlEditor.saved"))
      qc.invalidateQueries({ queryKey: ["integration", providerId] })
      qc.invalidateQueries({ queryKey: ["integration-overview"] })
    },
    // Server-side validation errors (e.g. the https:// rule) surface here as a MedusaError message.
    onError: (e: any) => toast.error(e?.message ?? t("tkassa.webhookUrlEditor.saveFailed")),
  })

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("tkassa.webhookUrlEditor.title")}</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          {t("tkassa.webhookUrlEditor.description")}
        </Text>
        <div className="flex flex-col gap-y-1">
          <Label size="small" weight="plus">
            {t("tkassa.fields.webhookUrl")}
          </Label>
          <Input
            type="url"
            placeholder={t("tkassa.webhookUrlEditor.placeholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div>
          <Button
            size="small"
            variant="secondary"
            isLoading={save.isPending}
            onClick={() => save.mutate()}
          >
            {t("tkassa.webhookUrlEditor.save")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "gorgo.integration.tkassa.after",
})

export default WebhookUrlEditor
