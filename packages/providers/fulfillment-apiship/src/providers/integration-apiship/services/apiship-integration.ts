import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput } from "@gorgo/medusa-integration"
import { createApishipClient } from "../../../lib/client"
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
    // Connections, sender address, product sizes and tax settings — not surfaced in any
    // section here (the rich Admin UI for it is injected as a widget into this page instead,
    // see src/admin/widgets/apiship-integration-{main,side}.tsx). Still part of the schema so
    // it's validated/encrypted alongside token and is_test.
    settings: {
      type: "json",
      default: {
        connections: [],
        default_sender_settings: { country_code: "", address_string: "", contact_name: "", phone: "" },
        default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
        delivery_cost_vat: -1,
        is_cod: false,
      },
      control: "json",
      label: "apiship.fields.settings",
    },
  },

  sections: [
    { id: "credentials", title: "apiship.sections.credentials", options: ["token", "is_test"] },
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
