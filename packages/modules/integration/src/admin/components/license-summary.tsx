import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Button, Text, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { LicenseSquare } from "./license-square"
import { useDescribeLicense, useLicenseDetails, useRecheckLicense } from "../lib/license"
import type { LicenseTone } from "../lib/describe-license"
import type { LicenseStateEntry } from "../../modules/integration/types"

/** Green and grey sit on the neutral background, orange and red are tinted like an `Alert`. */
const SURFACE: Record<LicenseTone, string> = {
  green: "bg-ui-bg-subtle border-ui-border-base",
  grey: "bg-ui-bg-subtle border-ui-border-base",
  orange: "bg-ui-tag-orange-bg border-ui-tag-orange-border",
  red: "bg-ui-tag-red-bg border-ui-tag-red-border",
}

/**
 * A paid integration's license on its page, under the description: the state, what to do about it,
 * "Check now" and the one link that fixes it. Nothing to click while the first check runs.
 */
export const LicenseSummary = ({ entry }: { entry: LicenseStateEntry }) => {
  const { t } = useTranslation()
  const view = useDescribeLicense()(entry)
  const details = useLicenseDetails()(view)
  const recheck = useRecheckLicense()

  return (
    <div className={clx("flex items-center gap-x-4 rounded-lg border px-4 py-3", SURFACE[view.tone])}>
      <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
        <div className="flex items-center gap-x-1">
          <LicenseSquare tone={view.tone} />
          <Text size="small" leading="compact" weight="plus" className="text-ui-fg-base">
            {t(view.title.key, view.title.values)}
          </Text>
        </div>
        {details && (
          <Text size="small" className="text-ui-fg-subtle">
            {details}
          </Text>
        )}
      </div>
      {entry.state !== "pending" && (
        <div className="flex shrink-0 items-center gap-x-2">
          <Button
            size="small"
            variant="transparent"
            isLoading={recheck.isPending}
            disabled={recheck.isPending}
            onClick={() => recheck.mutate()}
          >
            {t("integration.license.recheck")}
          </Button>
          {view.action && (
            <Button size="small" variant="secondary" asChild>
              <a href={view.action.href} target="_blank" rel="noopener noreferrer">
                {t(view.action.key)}
                <ArrowUpRightOnBox />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
