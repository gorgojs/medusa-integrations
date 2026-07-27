import type { OptionValidateContext } from "@gorgo/medusa-integration"
import { vatCodes as VAT_CODES, taxSystemCodes as TAX_SYSTEM_CODES } from "../payment-yookassa/types"

export const validateVatCode = (val: number | undefined, ctx: OptionValidateContext) => {
  if (!ctx.options.useReceipt) return
  if (val === undefined || val === null) {
    ctx.addIssue({ message: "Required when receipts are enabled" })
    return
  }
  if (!(VAT_CODES as readonly number[]).includes(val)) {
    ctx.addIssue({ message: `Must be one of: ${VAT_CODES.join(", ")}` })
  }
}

export const validateTaxSystemCode = (val: number | undefined, ctx: OptionValidateContext) => {
  if (!ctx.options.useAtolOnlineFFD120) return
  if (val === undefined || val === null) {
    ctx.addIssue({ message: "Required when Atol Online FFD 1.2 is enabled" })
    return
  }
  if (!(TAX_SYSTEM_CODES as readonly number[]).includes(val)) {
    ctx.addIssue({ message: `Must be one of: ${TAX_SYSTEM_CODES.join(", ")}` })
  }
}
