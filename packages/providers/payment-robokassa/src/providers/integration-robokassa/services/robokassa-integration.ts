import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput } from "@gorgo/medusa-integration"
import axios from "axios"
import { XMLParser } from "fast-xml-parser"
import { ROBOKASSA_ICON } from "../icon"
import { requiredWhenReceipt } from "../utils"
import { createSignature } from "../../payment-robokassa/utils"

const descriptor = defineIntegration({
  category: "payment",
  displayName: "robokassa.name",
  description: "robokassa.description",
  icon: ROBOKASSA_ICON,
  supportsMultipleInstances: true,
  preferredLayoutId: "core:two-column",

  options: {
    merchantLogin: {
      type: "string",
      required: true,
      minLength: 1,
      control: "text",
      label: "robokassa.fields.merchantLogin",
    },
    hashAlgorithm: {
      type: "enum",
      values: ["md5", "ripemd160", "sha1", "sha256", "sha384", "sha512"],
      required: true,
      control: "select",
      label: "robokassa.fields.hashAlgorithm",
    },
    password1: {
      type: "string",
      required: true,
      minLength: 1,
      secret: true,
      control: "secret",
      label: "robokassa.fields.password1",
    },
    password2: {
      type: "string",
      required: true,
      minLength: 1,
      secret: true,
      control: "secret",
      label: "robokassa.fields.password2",
    },
    capture: {
      type: "boolean",
      default: true,
      control: "switch",
      label: "robokassa.fields.capture",
    },
    isTest: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "robokassa.fields.isTest",
    },
    testPassword1: {
      type: "string",
      secret: true,
      control: "secret",
      label: "robokassa.fields.testPassword1",
      visibleWhen: { field: "isTest", equals: true },
    },
    testPassword2: {
      type: "string",
      secret: true,
      control: "secret",
      label: "robokassa.fields.testPassword2",
      visibleWhen: { field: "isTest", equals: true },
    },
    useReceipt: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "robokassa.fields.useReceipt",
    },
    taxation: {
      type: "enum",
      values: ["osn", "usn_income", "usn_income_outcome", "esn", "patent"],
      control: "select",
      label: "robokassa.fields.taxation",
      visibleWhen: { field: "useReceipt", equals: true },
      valueLabels: {
        osn: "robokassa.taxation.osn",
        usn_income: "robokassa.taxation.usn_income",
        usn_income_outcome: "robokassa.taxation.usn_income_outcome",
        esn: "robokassa.taxation.esn",
        patent: "robokassa.taxation.patent",
      },
      validate: requiredWhenReceipt,
    },
    taxItemDefault: {
      type: "enum",
      values: ["none", "vat0", "vat10", "vat110", "vat20", "vat120", "vat5", "vat7", "vat105", "vat107"],
      control: "select",
      label: "robokassa.fields.taxItemDefault",
      visibleWhen: { field: "useReceipt", equals: true },
      validate: requiredWhenReceipt,
    },
    taxShippingDefault: {
      type: "enum",
      values: ["none", "vat0", "vat10", "vat110", "vat20", "vat120", "vat5", "vat7", "vat105", "vat107"],
      control: "select",
      label: "robokassa.fields.taxShippingDefault",
      visibleWhen: { field: "useReceipt", equals: true },
      validate: requiredWhenReceipt,
    },
  },

  sections: [
    { id: "credentials", title: "robokassa.sections.credentials", options: ["merchantLogin", "hashAlgorithm", "password1", "password2"] },
    { id: "behavior", title: "robokassa.sections.behavior", column: "side", options: ["capture", "isTest", "testPassword1", "testPassword2"] },
    { id: "receipt", title: "robokassa.sections.receipt", options: ["useReceipt", "taxation", "taxItemDefault", "taxShippingDefault"] },
  ],

  testConnection: async ({ options }) => {
    if (!options.merchantLogin || !options.password2) {
      return { status: "failed", message: "Merchant login or password 2 is missing" }
    }
    try {
      const password = options.isTest ? (options.testPassword2 || options.password2) : options.password2
      const invoiceId = "0"
      const signature = createSignature([options.merchantLogin, invoiceId, password], options.hashAlgorithm)
      const params = new URLSearchParams({
        MerchantLogin: options.merchantLogin,
        InvoiceID: invoiceId,
        Signature: signature,
      }).toString()

      const { data: xml } = await axios.post(
        `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt?${params}`
      )
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" })
      const parsed = parser.parse(xml)
      const description: string = parsed?.OperationStateResponse?.Result?.Description ?? ""

      if (/подпис|signature|логин|login|merchant/i.test(description)) {
        return { status: "failed", message: description || "Invalid credentials" }
      }
      return { status: "passed", message: description || "Reachable" }
    } catch (e: any) {
      return { status: "failed", message: e?.message ?? "Connection failed" }
    }
  },
})

export type RobokassaOptions = z.infer<typeof descriptor.optionsSchema>

export class RobokassaIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = "robokassa"

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default RobokassaIntegrationProvider
