import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput } from "@gorgo/medusa-integration"
import { YooCheckout } from "@a2seven/yoo-checkout"
import { YOOKASSA_ICON } from "../icon"
import { validateVatCode, validateTaxSystemCode } from "../utils"
import { vatCodes, taxSystemCodes } from "../../payment-yookassa/types"
import { ProviderKeys } from "../../../types"

const VAT_CODE_LABELS = {
  1: "yookassa.vatCodes.noVat",
  2: "yookassa.vatCodes.vat0",
  3: "yookassa.vatCodes.vat10",
  4: "yookassa.vatCodes.vat20",
  5: "yookassa.vatCodes.vat10of110",
  6: "yookassa.vatCodes.vat20of120",
  7: "yookassa.vatCodes.vat5",
  8: "yookassa.vatCodes.vat7",
  9: "yookassa.vatCodes.vat5of105",
  10: "yookassa.vatCodes.vat7of107",
}

const TAX_SYSTEM_LABELS = {
  1: "yookassa.taxSystems.general",
  2: "yookassa.taxSystems.simplifiedIncome",
  3: "yookassa.taxSystems.simplifiedIncomeMinusExpenses",
  4: "yookassa.taxSystems.imputedIncome",
  5: "yookassa.taxSystems.agricultural",
  6: "yookassa.taxSystems.patent",
}

const descriptor = defineIntegration({
  category: "payment",
  displayName: "yookassa.name",
  description: "yookassa.description",
  icon: YOOKASSA_ICON,
  supportsMultipleInstances: true,
  preferredLayoutId: "core:two-column",

  options: {
    shopId: {
      type: "string",
      required: true,
      minLength: 1,
      control: "text",
      label: "yookassa.fields.shopId",
    },
    secretKey: {
      type: "string",
      required: true,
      minLength: 1,
      secret: true,
      control: "secret",
      label: "yookassa.fields.secretKey",
    },
    capture: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "yookassa.fields.capture",
    },
    paymentDescription: {
      type: "string",
      control: "text",
      label: "yookassa.fields.paymentDescription",
      hint: "yookassa.hints.paymentDescription",
    },
    useReceipt: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "yookassa.fields.useReceipt",
    },
    useAtolOnlineFFD120: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "yookassa.fields.useAtolOnlineFFD120",
      visibleWhen: { field: "useReceipt", equals: true },
    },
    taxSystemCode: {
      type: "enum",
      values: taxSystemCodes,
      label: "yookassa.fields.taxSystemCode",
      valueLabels: TAX_SYSTEM_LABELS,
      visibleWhen: { field: "useAtolOnlineFFD120", equals: true },
      validate: validateTaxSystemCode,
    },
    taxItemDefault: {
      type: "enum",
      values: vatCodes,
      label: "yookassa.fields.taxItemDefault",
      valueLabels: VAT_CODE_LABELS,
      visibleWhen: { field: "useReceipt", equals: true },
      validate: validateVatCode,
    },
    taxShippingDefault: {
      type: "enum",
      values: vatCodes,
      label: "yookassa.fields.taxShippingDefault",
      valueLabels: VAT_CODE_LABELS,
      visibleWhen: { field: "useReceipt", equals: true },
      validate: validateVatCode,
    },
  },

  sections: [
    {
      id: "credentials",
      title: "yookassa.sections.credentials",
      options: ["shopId", "secretKey"]
    },
    {
      id: "behavior",
      title: "yookassa.sections.behavior",
      column: "side",
      options: ["capture", "paymentDescription"]
    },
    {
      id: "receipt",
      title: "yookassa.sections.receipt",
      options: ["useReceipt", "useAtolOnlineFFD120", "taxSystemCode", "taxItemDefault", "taxShippingDefault"]
    },
  ],

  testConnection: async ({ options }) => {
    if (!options.shopId || !options.secretKey) {
      return { status: "failed", message: "Shop ID or secret key is missing" }
    }
    try {
      const client = new YooCheckout({ shopId: options.shopId, secretKey: options.secretKey })
      await client.getPaymentList({ limit: 1 })
      return { status: "passed" }
    } catch (e: any) {
      const message = e?.response?.data?.description ?? e?.message ?? "Connection failed"
      return { status: "failed", message }
    }
  },
})

export type YookassaOptions = z.infer<typeof descriptor.optionsSchema>

export class YookassaIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = ProviderKeys.YOOKASSA

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default YookassaIntegrationProvider
