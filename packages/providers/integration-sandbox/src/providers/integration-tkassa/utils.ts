import type { OptionValidateContext } from "@gorgo/medusa-integration"

/** Tax rates accepted by T-Kassa receipts (FFD). */
export const TAX = [
  "none", "vat0", "vat5", "vat7", "vat10", "vat20", "vat105", "vat107", "vat110", "vat120",
] as const

const NOTIF_EVENTS = ["payment", "refund", "all"]

/** Receipt sub-option required once `useReceipt` is on (cross-field, runs per-option + at full validation). */
export const requiredWhenReceipt = (val: string | undefined, ctx: OptionValidateContext) => {
  if (ctx.options.useReceipt && val == null) {
    ctx.addIssue({ message: "Required when receipts are enabled" })
  }
}

/** Validate the opaque `notifications` JSON: an array of `{ event, url }` (the DSL can't model it). */
export const validateNotifications = (val: unknown, ctx: OptionValidateContext) => {
  if (val == null) return
  if (!Array.isArray(val)) {
    ctx.addIssue({ message: "notifications must be an array" })
    return
  }
  val.forEach((item, i) => {
    const o = item as { event?: unknown; url?: unknown }
    if (!o || typeof o !== "object" || !NOTIF_EVENTS.includes(o.event as string)) {
      ctx.addIssue({ path: [i, "event"], message: `event must be one of ${NOTIF_EVENTS.join(", ")}` })
    }
    if (typeof o?.url !== "string" || o.url.length === 0) {
      ctx.addIssue({ path: [i, "url"], message: "url is required" })
    }
  })
}
