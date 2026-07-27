import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput } from "@gorgo/medusa-integration"
import { TKassa } from "t-kassa-api"
import { TKASSA_ICON } from "../icon"
import { TAX, requiredWhenReceipt } from "../utils"

const descriptor = defineIntegration({
  category: "payment",
  displayName: "tkassa.name",
  description: "tkassa.description",
  icon: TKASSA_ICON,
  supportsMultipleInstances: true,
  preferredLayoutId: "core:two-column",

  // Flat catalog — single source of truth for every option.
  options: {
    terminalKey: {
      type: "string",
      required: true,
      minLength: 1,
      control: "text",
      label: "tkassa.fields.terminalKey",
    },
    password: {
      type: "string",
      required: true,
      minLength: 1,
      secret: true,
      control: "secret",
      label: "tkassa.fields.password",
    },
    capture: {
      type: "boolean",
      default: true,
      control: "switch",
      label: "tkassa.fields.capture",
    },
    useReceipt: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "tkassa.fields.useReceipt",
    },
    ffdVersion: {
      type: "enum",
      values: ["1.2", "1.05"],
      default: "1.2",
      control: "select",
      label: "tkassa.fields.ffdVersion",
      visibleWhen: { field: "useReceipt", equals: true },
      validate: requiredWhenReceipt,
    },
    taxation: {
      type: "enum",
      values: ["osn", "usn_income", "usn_income_outcome", "esn", "patent"],
      control: "select",
      label: "tkassa.fields.taxation",
      visibleWhen: { field: "useReceipt", equals: true },
      valueLabels: {
        osn: "tkassa.taxation.osn",
        usn_income: "tkassa.taxation.usn_income",
        usn_income_outcome: "tkassa.taxation.usn_income_outcome",
        esn: "tkassa.taxation.esn",
        patent: "tkassa.taxation.patent",
      },
      validate: requiredWhenReceipt,
    },
    taxItemDefault: {
      type: "enum",
      values: TAX,
      control: "select",
      label: "tkassa.fields.taxItemDefault",
      visibleWhen: { field: "useReceipt", equals: true },
      validate: requiredWhenReceipt,
    },
    taxShippingDefault: {
      type: "enum",
      values: TAX,
      control: "select",
      label: "tkassa.fields.taxShippingDefault",
      visibleWhen: { field: "useReceipt", equals: true },
      validate: requiredWhenReceipt,
    },
  },

  sections: [
    { id: "credentials", title: "tkassa.sections.credentials", options: ["terminalKey", "password"] },
    { id: "behavior", title: "tkassa.sections.behavior", column: "side", options: ["capture"] },
    { id: "receipt", title: "tkassa.sections.receipt", options: ["useReceipt", "ffdVersion", "taxation", "taxItemDefault", "taxShippingDefault"] },
  ],

  // Cross-section rule: receipts require auto-capture. Runs only at full/activation validation.
  validate: (full, ctx) => {
    const { capture, useReceipt } = full as { capture?: boolean; useReceipt?: boolean }
    if (useReceipt && !capture) {
      ctx.addIssue({ path: ["capture"], message: "Auto-capture must be enabled to send receipts" })
    }
  },

  // Verify credentials via a signed read-only GetState: a structured response means terminal +
  // signature were accepted; a token/terminal error means bad credentials. Never throws.
  testConnection: async ({ options }) => {
    if (!options.terminalKey || !options.password) {
      return { status: "failed", message: "Terminal key or password is missing" }
    }
    try {
      const client = new TKassa(options.terminalKey, options.password, { server: "https://securepay.tinkoff.ru" })
      const res = (await client.getState({ PaymentId: "0" } as any)) as Record<string, any>
      if (res?.Success === true) {
        return { status: "passed" }
      }
      const message = `${res?.Message ?? ""} ${res?.Details ?? ""}`.trim()
      // Token/terminal errors = bad credentials; anything else means we authenticated.
      if (/token|подпис|terminal|термина/i.test(message)) {
        return { status: "failed", message: res?.Message || "Invalid credentials" }
      }
      return { status: "passed", message: message || "Reachable" }
    } catch (e: any) {
      return { status: "failed", message: e?.message ?? "Connection failed" }
    }
  },
})

export type TKassaOptions = z.infer<typeof descriptor.optionsSchema>

/**
 * Integration-provider for T-Kassa: declares the options contract (identifier → `provider_id`
 * "int_tkassa"). Payment behaviour lives in the separate `payment-tkassa` provider.
 */
export class TkassaIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = "tkassa"

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default TkassaIntegrationProvider
