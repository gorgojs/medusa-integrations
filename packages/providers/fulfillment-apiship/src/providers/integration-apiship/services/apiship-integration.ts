import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput } from "@gorgo/medusa-integration"
import { createApishipClient } from "../../../lib/client"
import { APISHIP_DEFAULTS, APISHIP_VAT_RATES } from "../../../lib/apiship-options"
import { APISHIP_COUNTRY_CODES, APISHIP_COUNTRY_LABELS } from "../../../data/countries"
import { ProviderKeys } from "../../../types"
import { APISHIP_ICON } from "../icon"

const descriptor = defineIntegration({
  category: "fulfillment",
  displayName: "apiship.name",
  description: "apiship.description",
  icon: APISHIP_ICON,
  preferredLayoutId: "core:two-column",
  supportsMultipleInstances: true,

  // Flat catalog — single source of truth for every option.
  options: {
    token: {
      type: "string",
      required: true,
      minLength: 1,
      secret: true,
      control: "secret",
      label: "apiship.fields.token",
    },
    is_test: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "apiship.fields.isTest",
    },
    is_cod: {
      type: "boolean",
      default: APISHIP_DEFAULTS.is_cod,
      control: "switch",
      label: "apiship.fields.isCod",
      hint: "apiship.fields.isCodHint",
    },
    // Only sent to ApiShip together with cash-on-delivery, hence `visibleWhen`.
    delivery_cost_vat: {
      type: "enum",
      values: APISHIP_VAT_RATES,
      default: APISHIP_DEFAULTS.delivery_cost_vat,
      control: "select",
      label: "apiship.fields.deliveryCostVat",
      placeholder: "apiship.vat.noVat",
      visibleWhen: { field: "is_cod", equals: true },
      valueLabels: {
        "-1": "apiship.vat.noVat",
        "0": "apiship.vat.vat0",
        "5": "apiship.vat.vat5",
        "7": "apiship.vat.vat7",
        "10": "apiship.vat.vat10",
        "20": "apiship.vat.vat20",
        "22": "apiship.vat.vat22",
      },
    },

    // Fallbacks for products with no dimensions of their own. The defaults live in
    // APISHIP_DEFAULTS so the resolver, the admin form and the read-only card all agree;
    // clearing a field re-applies the default rather than leaving it unset.
    default_product_length: {
      type: "number",
      default: APISHIP_DEFAULTS.default_product_length,
      positive: true,
      control: "number",
      label: "apiship.fields.defaultProductLength",
      placeholder: "apiship.fields.defaultProductLengthPlaceholder",
    },
    default_product_width: {
      type: "number",
      default: APISHIP_DEFAULTS.default_product_width,
      positive: true,
      control: "number",
      label: "apiship.fields.defaultProductWidth",
      placeholder: "apiship.fields.defaultProductWidthPlaceholder",
    },
    default_product_height: {
      type: "number",
      default: APISHIP_DEFAULTS.default_product_height,
      positive: true,
      control: "number",
      label: "apiship.fields.defaultProductHeight",
      placeholder: "apiship.fields.defaultProductHeightPlaceholder",
    },
    default_product_weight: {
      type: "number",
      default: APISHIP_DEFAULTS.default_product_weight,
      positive: true,
      control: "number",
      label: "apiship.fields.defaultProductWeight",
      placeholder: "apiship.fields.defaultProductWeightPlaceholder",
    },

    // Sender defaults. Only used when creating an order, and only for the fields the stock
    // location doesn't provide — price calculation works without them, and
    // `assertOrderOptions_` is what enforces they're filled by the time an order is created.
    // No `default`: an empty string is "not filled in", not a meaningful value.
    sender_country_code: {
      type: "enum",
      values: APISHIP_COUNTRY_CODES,
      valueLabels: APISHIP_COUNTRY_LABELS,
      control: "select",
      label: "apiship.fields.senderCountryCode",
      placeholder: "apiship.fields.senderCountryCodePlaceholder",
    },
    sender_address_string: {
      type: "string",
      control: "text",
      label: "apiship.fields.senderAddressString",
      placeholder: "apiship.fields.senderAddressStringPlaceholder",
      hint: "apiship.fields.senderAddressStringHint",
    },
    sender_contact_name: {
      type: "string",
      control: "text",
      label: "apiship.fields.senderContactName",
      placeholder: "apiship.fields.senderContactNamePlaceholder",
    },
    sender_phone: {
      type: "string",
      control: "text",
      label: "apiship.fields.senderPhone",
      placeholder: "apiship.fields.senderPhonePlaceholder",
    },

    // Delivery-service connections — a list of records, for which the descriptor's option
    // catalog has no control, so their Admin UI stays a widget injected into this page
    // (src/admin/widgets/apiship-integration-main.tsx). Still part of the schema so it's
    // validated/encrypted alongside the rest.
    settings: {
      type: "json",
      // Only the connection list lives here now.
      default: { connections: [] },
      control: "json",
      label: "apiship.fields.settings",
    },
  },

  sections: [
    {
      id: "credentials",
      title: "apiship.sections.credentials",
      options: ["token", "is_test"]
    },
    {
      id: "payment_and_tax",
      title: "apiship.sections.paymentAndTax",
      column: "side",
      options: ["is_cod", "delivery_cost_vat"],
    },
    {
      id: "default_product_sizes",
      title: "apiship.sections.defaultProductSizes",
      column: "side",
      options: [
        "default_product_length",
        "default_product_width",
        "default_product_height",
        "default_product_weight",
      ],
    },
    {
      id: "sender",
      title: "apiship.sections.sender",
      options: [
        "sender_country_code",
        "sender_address_string",
        "sender_contact_name",
        "sender_phone",
      ],
    },
  ],

  // Verify credentials via a real (read-only) list-connections call. Never throws.
  testConnection: async ({ options }) => {
    if (!options.token) {
      return { status: "failed", message: "Token is missing" }
    }
    try {
      const client = createApishipClient({ token: options.token, isTest: options.is_test })
      const { data } = await client.connectionsApi.getListConnections()
      if (!data?.rows) {
        return { status: "failed", message: "Invalid credentials" }
      }
      return { status: "passed" }
    } catch (e: any) {
      return { status: "failed", message: e?.response?.data?.message ?? e?.message ?? "Connection failed" }
    }
  },
})

export type ApishipIntegrationOptions = z.infer<typeof descriptor.optionsSchema>

/**
 * Integration-provider for ApiShip: declares the options contract (identifier → `provider_id`
 * "int_apiship"). Fulfillment behaviour lives in the separate `fulfillment-apiship` provider.
 */
export class ApishipIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = ProviderKeys.APISHIP

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default ApishipIntegrationProvider
