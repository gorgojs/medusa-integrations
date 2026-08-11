import type { OptionValidateContext } from "@gorgo/medusa-integration"

export const validateVatCode = (val: number | undefined, ctx: OptionValidateContext) => {
  if (!ctx.options.useReceipt) return
  if (val === undefined || val === null) {
    ctx.addIssue({ message: "Required when receipts are enabled" })
  }
}

export const validateTaxSystemCode = (val: number | undefined, ctx: OptionValidateContext) => {
  if (!ctx.options.useAtolOnlineFFD120) return
  if (val === undefined || val === null) {
    ctx.addIssue({ message: "Required when Atol Online FFD 1.2 is enabled" })
  }
}
