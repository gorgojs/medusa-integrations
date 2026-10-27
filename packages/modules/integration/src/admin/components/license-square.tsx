import { clx } from "@medusajs/ui"
import type { LicenseTone } from "../lib/describe-license"

const ICON: Record<LicenseTone, string> = {
  green: "bg-ui-tag-green-icon",
  grey: "bg-ui-tag-neutral-icon",
  orange: "bg-ui-tag-orange-icon",
  red: "bg-ui-tag-red-icon",
}

/** The tone square of `StatusBadge`, without the badge around it. As tall as a compact line of text. */
export const LicenseSquare = ({ tone }: { tone: LicenseTone }) => (
  <span role="presentation" className="flex h-5 w-[15px] shrink-0 items-center justify-center">
    <span className={clx("size-2 rounded-sm", ICON[tone])} />
  </span>
)
