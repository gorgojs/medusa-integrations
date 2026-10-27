import { Text, Tooltip, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { LicenseSquare } from "./license-square"
import { useDescribeLicense, useLicenseDetails } from "../lib/license"
import type { LicenseTone } from "../lib/describe-license"
import type { LicenseStateEntry } from "../../modules/integration/types"

const TEXT: Record<LicenseTone, string> = {
  green: "text-ui-fg-subtle",
  grey: "text-ui-fg-subtle",
  orange: "text-ui-tag-orange-text",
  red: "text-ui-tag-red-text",
}

/** A paid integration's license as one line under its name in Settings → Integrations. */
export const LicenseLine = ({ entry }: { entry: LicenseStateEntry }) => {
  const { t } = useTranslation()
  const view = useDescribeLicense()(entry)
  const details = useLicenseDetails()(view, { withChecked: true })

  // The table cell does not wrap and clips at the column's edge, so a long line wraps on its own.
  const line = (
    <div className="flex w-fit items-start gap-x-1">
      <LicenseSquare tone={view.tone} />
      <Text size="xsmall" leading="compact" className={clx("whitespace-normal", TEXT[view.tone])}>
        {t(view.line.key, view.line.values)}
      </Text>
    </div>
  )
  return details ? (
    <Tooltip content={details} maxWidth={480}>
      {line}
    </Tooltip>
  ) : (
    line
  )
}
