import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Badge, toast } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type { IntegrationSectionData } from "@gorgo/medusa-integration"
import { sdk } from "../lib/sdk"

/**
 * EXAMPLE custom integration section, shipped by the T-Kassa plugin.
 *
 * It's a plain Medusa widget injected into the integration options page's per-plugin zone
 * `gorgo.integration.tkassa.after` (the page hosts that zone via LayoutComposer). The page
 * passes this integration's data through LayoutComposer's `data` prop, so the widget receives
 * it as `props.data` ({@link IntegrationSectionData}) — no registry, no cross-plugin imports
 * of components.
 *
 * It reads a non-secret option (terminalKey) and calls a provider endpoint. Anything needing
 * a secret (the password) is done server-side: the `/test-connection` route reads the resolved
 * options on the backend, so the secret never reaches the browser.
 */
const WebhookTester = ({ data }: { data: IntegrationSectionData }) => {
  const { t } = useTranslation()
  const { providerId, values, isComplete } = data
  const terminalKey = (values.terminalKey as string) || "—"

  const ping = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ status: string; message?: string }>(
        `/admin/integrations/${providerId}/test-connection`,
        { method: "POST" }
      ),
    onSuccess: (r) =>
      r.status === "passed"
        ? toast.success(t("tkassa.webhookTester.reachable"))
        : toast.warning(r.message ?? r.status),
    onError: (e: any) => toast.error(e?.message ?? t("tkassa.webhookTester.failed")),
  })

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("tkassa.webhookTester.title")}</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          {t("tkassa.webhookTester.description")}
        </Text>
        <div className="flex items-center gap-x-2">
          <Text size="small" weight="plus" leading="compact">
            {t("tkassa.webhookTester.terminal")}
          </Text>
          <Badge size="2xsmall" color="grey">
            {terminalKey}
          </Badge>
        </div>
        <div className="flex flex-col gap-y-1">
          <div>
            <Button
              size="small"
              variant="secondary"
              disabled={!isComplete || ping.isPending}
              isLoading={ping.isPending}
              onClick={() => ping.mutate()}
            >
              {t("tkassa.webhookTester.send")}
            </Button>
          </div>
          {!isComplete && (
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("tkassa.webhookTester.needsConfig")}
            </Text>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "gorgo.integration.tkassa.side.after",
})

export default WebhookTester
