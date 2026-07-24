import {
  Container,
  Heading,
  Text,
  Badge,
  StatusBadge,
  IconButton,
  DropdownMenu,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { EllipsisHorizontal, PencilSquare, Trash, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useState, type ReactNode } from "react"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { sdk } from "../../../../lib/sdk"
import { IntegrationIcon } from "../../../../components/integration-icon"
import { IntegrationFieldValue } from "../../../../components/integration-form/field-value"
import { EditSectionDrawer } from "../../../../components/integration-form/edit-section-drawer"
import { isFieldVisible } from "../../../../components/integration-form/visibility"
import type { AdminIntegrationResponse, IntegrationSectionData, UiSection } from "../../../../../types"

/** A Medusa-admin section row: label on the left, value on the right. */
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
    <Text size="small" weight="plus" leading="compact">
      {label}
    </Text>
    <div className="flex items-center gap-x-2">{children}</div>
  </div>
)

const EditPage = () => {
  const { t } = useTranslation()
  const { provider_id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const [editingSection, setEditingSection] = useState<string | null>(null)

  // Single query: the resource endpoint returns descriptor (UI schema) + current values.
  const { data, isLoading } = useQuery({
    queryKey: ["integration", provider_id],
    queryFn: () => sdk.client.fetch<AdminIntegrationResponse>(`/admin/integrations/${provider_id}`),
  })

  const descriptor = data?.descriptor
  const record = data?.integration
  const isConfigured = !!record
  // A configured row whose stored config still fails full validation (missing required
  // fields somewhere, or a cross-section rule). Incomplete configs don't resolve at runtime.
  const isComplete = data?.is_complete ?? false

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["integration", provider_id] })
    qc.invalidateQueries({ queryKey: ["integration-overview"] })
  }

  const test = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ status: string; message?: string }>(
        `/admin/integrations/${provider_id}/test-connection`,
        { method: "POST" }
      ),
    onSuccess: (r) => {
      r.status === "passed"
        ? toast.success(t("integration.toast.connectionOk"))
        : toast.warning(r.message ?? r.status)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.toast.testFailed")),
  })

  const toggleEnabled = useMutation({
    mutationFn: (next: boolean) =>
      sdk.client.fetch(`/admin/integrations/${provider_id}/enable`, {
        method: "POST",
        body: { is_enabled: next },
      }),
    onSuccess: (_d, next) => {
      toast.success(next ? t("integration.toast.enabled") : t("integration.toast.disabled"))
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.toast.updateFailed")),
  })

  const remove = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/integrations/${provider_id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("integration.toast.deleted"))
      invalidate()
      navigate("/settings/integrations")
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.toast.deleteFailed")),
  })

  const onDelete = async () => {
    const confirmed = await prompt({
      title: t("integration.delete.title"),
      description: t("integration.delete.description", {
        name: descriptor ? t(descriptor.displayName) : "",
      }),
      confirmText: t("integration.actions.delete"),
      cancelText: t("integration.actions.cancel"),
    })
    if (confirmed) remove.mutate()
  }

  if (isLoading) {
    return (
      <Container className="flex items-center justify-center p-8">
        <Spinner className="text-ui-fg-subtle animate-spin" />
      </Container>
    )
  }

  if (!descriptor) {
    return (
      <Container className="p-6">
        <Text size="small" className="text-ui-fg-subtle">
          {t("integration.unknown", { id: provider_id })}
        </Text>
        <Link to="/settings/integrations" className="text-ui-fg-interactive">
          {t("integration.back")}
        </Link>
      </Container>
    )
  }

  const version = data?.version ?? null
  const author = data?.author ?? null
  const authorUrl = data?.author_url ?? null

  // Same two-badge mapping as the list's StatusCell.
  const lifecycle = !isConfigured
    ? { color: "grey" as const, label: t("integration.status.notConfigured") }
    : !isComplete
      ? { color: "orange" as const, label: t("integration.status.incomplete") }
      : record!.is_enabled
        ? { color: "green" as const, label: t("integration.status.enabled") }
        : { color: "grey" as const, label: t("integration.status.disabled") }

  const connection = descriptor.hasTestConnection
    ? record?.last_test_status === "passed"
      ? { color: "green" as const, label: t("integration.status.connected") }
      : record?.last_test_status === "failed"
        ? { color: "red" as const, label: t("integration.status.connectionFailed") }
        : { color: "grey" as const, label: t("integration.status.notTested") }
    : null

  const editing = descriptor.sections.find((s) => s.id === editingSection) ?? null
  // Secret keys with a stored value — per field, so only the actually-set secrets render as
  // "configured" (••••••) and skip the "required" hint; unset ones still prompt to fill.
  const configuredSecrets = new Set<string>(record?.configured_secrets ?? [])

  // Data handed to provider-supplied custom-section widgets (injected via LayoutComposer's
  // per-plugin zone). Secrets are never included.
  const sectionData: IntegrationSectionData = {
    providerId: provider_id!,
    identifier: descriptor.identifier,
    values: (record?.values as Record<string, unknown>) ?? {},
    isComplete,
  }

  const renderSection = (section: UiSection) => (
    <LayoutComposer.Entry id={section.id}>
      <Container key={section.id} className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">{t(section.title)}</Heading>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton size="small" variant="transparent">
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item className="gap-x-2" onClick={() => setEditingSection(section.id)}>
                <PencilSquare className="text-ui-fg-subtle" />
                {t("integration.actions.edit")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
        {section.fields
          .filter((f) => isFieldVisible(f, (record?.values as Record<string, unknown>) ?? {}))
          .map((f) => (
          <Row key={f.name} label={t(f.label)}>
            <IntegrationFieldValue
              field={f}
              value={record?.values?.[f.name]}
              secretConfigured={configuredSecrets.has(f.name)}
            />
          </Row>
        ))}
      </Container>
    </LayoutComposer.Entry>
  )

  // Sections opt into the side column via the descriptor's `column` (default "main").
  const mainSections = descriptor.sections.filter((s) => s.column !== "side")
  const sideSections = descriptor.sections.filter((s) => s.column === "side")

  const main = (
    <>
      {/* Identity / overview card */}
      <LayoutComposer.Entry id="main">
        <Container className="divide-y p-0">
          <div className="flex flex-col gap-y-3 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-x-3">
                <IntegrationIcon src={descriptor.icon} alt={t(descriptor.displayName)} />
                <div className="flex flex-col gap-y-1">
                  <div className="flex items-center gap-x-2">
                    <Heading>{t(descriptor.displayName)}</Heading>
                    {descriptor.instanceId && (
                      <Badge size="2xsmall" color="grey">
                        {descriptor.instanceId}
                      </Badge>
                    )}
                  </div>
                  {version && (
                    <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                      {t("integration.meta.version", { version })}
                      {author &&
                        (authorUrl ? (
                          <>
                            {" • "}
                            <a
                              href={authorUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ui-fg-interactive"
                            >
                              {t("integration.meta.author", { author })}
                            </a>
                          </>
                        ) : (
                          <>{" • " + t("integration.meta.author", { author })}</>
                        ))}
                    </Text>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-x-2">
                <StatusBadge color={lifecycle.color}>{lifecycle.label}</StatusBadge>
                {connection && <StatusBadge color={connection.color}>{connection.label}</StatusBadge>}
                {isConfigured && (
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton size="small" variant="transparent">
                        <EllipsisHorizontal />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      {descriptor.hasTestConnection && record!.is_enabled && isComplete && (
                        <DropdownMenu.Item disabled={test.isPending} onClick={() => test.mutate()}>
                          {t("integration.actions.test")}
                        </DropdownMenu.Item>
                      )}
                      {isConfigured && (
                        <DropdownMenu.Item
                          disabled={toggleEnabled.isPending}
                          onClick={() => toggleEnabled.mutate(!record!.is_enabled)}
                        >
                          {record!.is_enabled ? t("integration.actions.disable") : t("integration.actions.enable")}
                        </DropdownMenu.Item>
                      )}
                      {isConfigured && <DropdownMenu.Separator />}
                      {isConfigured && (
                        <DropdownMenu.Item className="gap-x-2" onClick={onDelete}>
                          <Trash className="text-ui-fg-subtle" />
                          {t("integration.actions.delete")}
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {descriptor.description && (
              <Text size="small" className="text-ui-fg-subtle">
                {t(descriptor.description)}
              </Text>
            )}
          </div>

          <Row label={t("integration.labels.category")}>
            <Badge size="2xsmall" color="grey">
              {t(`integration.categories.${descriptor.category}`)}
            </Badge>
          </Row>
        </Container>
      </LayoutComposer.Entry>

      {/* Main-column descriptor sections */}
      {mainSections.map(renderSection)}

      {editing && (
        <EditSectionDrawer
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditingSection(null)}
          providerId={provider_id!}
          section={editing}
          values={record?.values ?? {}}
          configuredSecrets={record?.configured_secrets ?? []}
        />
      )}
    </>
  )

  const side = <>{sideSections.map(renderSection)}</>

  return (
    <LayoutComposer
      widgetsZonePrefix={`gorgo.integration.${descriptor.identifier}`}
      preferredLayoutId={descriptor.preferredLayoutId}
      sections={{ main, side }}
      data={sectionData}
      hasOutlet={false}
    />
  )
}

/**
 * Breadcrumb for a single integration. Shows the (translated) display name — reusing the same
 * `["integration", provider_id]` query the page uses, so it reads from the React Query cache
 * (no extra request when arriving from the list; one shared fetch on a deep link). Medusa
 * renders this via the route's `handle.breadcrumb` (`useMatches`); `provider_id` is falled back
 * to while the descriptor loads.
 */
const IntegrationBreadcrumb = ({ params }: { params: { provider_id?: string } }) => {
  const { t } = useTranslation()
  const providerId = params.provider_id
  const { data } = useQuery({
    queryKey: ["integration", providerId],
    queryFn: () =>
      sdk.client.fetch<AdminIntegrationResponse>(`/admin/integrations/${providerId}`),
    enabled: !!providerId,
  })
  const descriptor = data?.descriptor
  if (!descriptor) return <>{providerId}</>
  const name = t(descriptor.displayName)
  return <>{descriptor.instanceId ? `${name} · ${descriptor.instanceId}` : name}</>
}

export const handle = {
  breadcrumb: ({ params }: { params: { provider_id?: string } }) => (
    <IntegrationBreadcrumb params={params} />
  ),
}

export default EditPage
