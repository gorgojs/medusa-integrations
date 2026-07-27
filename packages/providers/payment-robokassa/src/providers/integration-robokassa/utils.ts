import type { OptionValidateContext } from "@gorgo/medusa-integration"

export const requiredWhenReceipt = (val: string | undefined, ctx: OptionValidateContext) => {
  if (ctx.options.useReceipt && val == null) {
    ctx.addIssue({ message: "Required when receipts are enabled" })
  }
}
