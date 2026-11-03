import { Button, Drawer, Text, toast } from "@medusajs/ui"
import { Spinner, TriangleDownMini, TriangleRightMini } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
import { ChangeActor } from "./change-actor"
import { ChangeDiff } from "./change-diff"
import { DetailRow } from "./detail-row"
import { descriptorLookup } from "./change-timeline"
import { useChangeTimeFormat, useIntegrationChange } from "../../lib/changes"
import { sdk } from "../../lib/sdk"
import { IntegrationIcon } from "../integration-icon"
import type { AdminIntegrationResponse } from "../../../types"

const CHANGE_PARAM = "change"

/** The change card is open while the `change` search param holds an id. Other params are kept. */
export function useChangeParam() {
  const [params, setParams] = useSearchParams()
  const changeId = params.get(CHANGE_PARAM)
  const open = useCallback(
    (id: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set(CHANGE_PARAM, id)
        return next
      }),
    [setParams]
  )
  const close = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete(CHANGE_PARAM)
        return next
      }),
    [setParams]
  )
  return { changeId, open, close }
}

type SectionKey = "general" | "metadata" | "changes"

// Where the request came from is rarely needed, so it stays folded until asked for.
const OPEN_BY_DEFAULT: Record<SectionKey, boolean> = { general: true, metadata: false, changes: true }

/** A full-width accordion section of the change card. */
const Section = ({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) => (
  <div>
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover border-ui-border-base focus-visible:shadow-borders-focus flex w-full items-center justify-between gap-x-2 border-b px-6 py-2 text-left outline-none"
    >
      <Text size="small" leading="compact" weight="plus">
        {title}
      </Text>
      {open ? <TriangleDownMini className="text-ui-fg-muted" /> : <TriangleRightMini className="text-ui-fg-muted" />}
    </button>
    {open && children}
  </div>
)

const Plain = ({ children }: { children: ReactNode }) => (
  <Text size="small" leading="compact">
    {children}
  </Text>
)

/** Read-only card of one change: who, when, from where, and every changed option. */
export const ChangeDrawer = ({ changeId, onClose }: { changeId: string | null; onClose: () => void }) => {
  const { t } = useTranslation()
  const time = useChangeTimeFormat()
  const { data, isLoading } = useIntegrationChange(changeId)
  const change = data?.integration_change
  const [open, setOpen] = useState(OPEN_BY_DEFAULT)
  useEffect(() => setOpen(OPEN_BY_DEFAULT), [changeId])
  const toggle = (key: SectionKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  // Same key as the integration page, so it is usually cached. A provider that is gone answers 404:
  // the card then labels the entries with what the change stored.
  const { data: integration } = useQuery({
    queryKey: ["integration", change?.provider_id],
    queryFn: () => sdk.client.fetch<AdminIntegrationResponse>(`/admin/integrations/${change!.provider_id}`),
    enabled: !!change,
    retry: false,
  })
  const descriptor = integration?.descriptor
  const { fields } = descriptorLookup(descriptor)

  // The change as the API returned it: secret values are not in it.
  const copyJson = async () => {
    if (!change) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(change, null, 2))
      toast.success(t("integration.history.detail.copied"))
    } catch {
      toast.error(t("integration.history.detail.copyFailed"))
    }
  }

  return (
    <Drawer open={!!changeId} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("integration.history.detail.title")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-1 flex-col overflow-auto p-0">
          {isLoading ? (
            <div className="flex items-center justify-center px-6 py-4">
              <Spinner className="text-ui-fg-subtle animate-spin" />
            </div>
          ) : !change ? (
            <Text size="small" leading="compact" className="text-ui-fg-subtle px-6 py-4">
              {t("integration.history.detail.notFound")}
            </Text>
          ) : (
            <>
              <Section
                title={t("integration.history.detail.general")}
                open={open.general}
                onToggle={() => toggle("general")}
              >
                <DetailRow label={t("integration.history.detail.integration")}>
                  {descriptor ? (
                    <Link
                      to={`/settings/integrations/${change.provider_id}`}
                      className="hover:text-ui-fg-interactive flex items-center gap-x-2"
                    >
                      <IntegrationIcon src={descriptor.icon} alt={t(descriptor.displayName)} size="xsmall" />
                      <Plain>{t(descriptor.displayName)}</Plain>
                    </Link>
                  ) : (
                    <Plain>{change.provider_id}</Plain>
                  )}
                </DetailRow>
                <DetailRow label={t("integration.history.detail.author")}>
                  <ChangeActor change={change} className="text-ui-fg-base" />
                </DetailRow>
                <DetailRow label={t("integration.history.detail.time")}>
                  <Plain>{time.full(change.occurred_at)}</Plain>
                </DetailRow>
              </Section>
              <Section
                title={t("integration.history.detail.metadata")}
                open={open.metadata}
                onToggle={() => toggle("metadata")}
              >
                <DetailRow label={t("integration.history.detail.ip")}>
                  <Plain>{change.ip || "-"}</Plain>
                </DetailRow>
                <DetailRow label={t("integration.history.detail.userAgent")}>
                  <Plain>{change.user_agent || "-"}</Plain>
                </DetailRow>
                <DetailRow label={t("integration.history.detail.requestId")}>
                  <Plain>{change.request_id || "-"}</Plain>
                </DetailRow>
              </Section>
              {/* A toggle changes no options, so it has no changes to list. */}
              {change.diff.length > 0 && (
                <Section
                  title={t("integration.history.detail.changes")}
                  open={open.changes}
                  onToggle={() => toggle("changes")}
                >
                  <ChangeDiff diff={change.diff} fields={fields} />
                </Section>
              )}
            </>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Button size="small" variant="secondary" className="w-full" disabled={!change} onClick={copyJson}>
            {t("integration.history.detail.copyJson")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
