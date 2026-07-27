import type { OptionValidateContext } from "@gorgo/medusa-integration"

/** Tax rates accepted by T-Kassa receipts (FFD). */
export const TAX = [
  "none", "vat0", "vat5", "vat7", "vat10", "vat20", "vat105", "vat107", "vat110", "vat120",
] as const

/** Receipt sub-option required once `useReceipt` is on (cross-field, runs per-option + at full validation). */
export const requiredWhenReceipt = (val: string | undefined, ctx: OptionValidateContext) => {
  if (ctx.options.useReceipt && val == null) {
    ctx.addIssue({ message: "Required when receipts are enabled" })
  }
}
