import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput } from "@gorgo/medusa-integration"
import { logger } from "@medusajs/framework/logger"
import { callMollie, getMollie } from "../../../lib/mollie-client"
import { ProviderKeys } from "../../../types"
import { WEBHOOK_PATH_PREFIX } from "../../../utils/webhook"
import { MOLLIE_ICON } from "../icon"

/** Where a Mollie webhook can point: an `https://` URL on the route Medusa gives this provider. */
export function webhookUrlProblem(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return "Enter the full webhook URL, starting with https://"
  }
  if (url.protocol !== "https:") {
    return "Mollie calls webhooks over https only"
  }
  if (!url.pathname.includes(WEBHOOK_PATH_PREFIX)) {
    return `The webhook URL has to end with ${WEBHOOK_PATH_PREFIX}<id>, the route of this provider on your backend`
  }
  return null
}

const descriptor = defineIntegration({
  category: "payment",
  displayName: "mollie.name",
  description: "mollie.description",
  icon: MOLLIE_ICON,
  supportsMultipleInstances: true,
  preferredLayoutId: "core:two-column",

  options: {
    apiKey: {
      type: "string",
      required: true,
      minLength: 1,
      pattern: "^(test|live)_\\w+$",
      secret: true,
      control: "secret",
      label: "mollie.fields.apiKey",
      hint: "mollie.hints.apiKey",
    },
    webhookUrl: {
      type: "string",
      required: true,
      minLength: 1,
      control: "text",
      label: "mollie.fields.webhookUrl",
      hint: "mollie.hints.webhookUrl",
      validate: (value, ctx) => {
        const problem = webhookUrlProblem(value)
        if (problem) {
          ctx.addIssue({ message: problem })
        }
      },
    },
    capture: {
      type: "enum",
      values: ["automatic", "manual"],
      default: "automatic",
      control: "select",
      label: "mollie.fields.capture",
      hint: "mollie.hints.capture",
      valueLabels: {
        automatic: "mollie.captures.automatic",
        manual: "mollie.captures.manual",
      },
    },
    paymentDescription: {
      type: "string",
      maxLength: 255,
      control: "text",
      label: "mollie.fields.paymentDescription",
      hint: "mollie.hints.paymentDescription",
    },
  },

  sections: [
    {
      id: "credentials",
      title: "mollie.sections.credentials",
      options: ["apiKey", "webhookUrl"],
    },
    {
      id: "behavior",
      title: "mollie.sections.behavior",
      column: "side",
      options: ["capture", "paymentDescription"],
    },
  ],

  // Reads the website profile the API key belongs to, which proves the key and names its mode.
  // Never throws.
  testConnection: async ({ options }) => {
    const apiKey = options.apiKey
    if (typeof apiKey !== "string" || !apiKey) {
      return { status: "failed", message: "The API key is missing" }
    }
    const problem = webhookUrlProblem(typeof options.webhookUrl === "string" ? options.webhookUrl : undefined)
    if (problem) {
      return { status: "failed", message: problem }
    }
    try {
      const profile = await callMollie(logger, "getCurrentProfile", {}, () => getMollie(apiKey).profiles.getCurrent())
      return {
        status: "passed",
        // `profile.mode` is the profile's own mode, which reads `live` for a test key too: the key names it
        message: `Mode: ${apiKey.startsWith("test_") ? "test" : "live"}. Website profile: ${profile.name} (${profile.id}), ${profile.status}`,
      }
    } catch (error) {
      return { status: "failed", message: (error as Error)?.message ?? "Connection failed" }
    }
  },
})

export type MollieOptions = z.infer<typeof descriptor.optionsSchema>

/**
 * Integration-provider for Mollie: declares the options contract (identifier → `provider_id`
 * "int_mollie"). Payment behaviour lives in the separate `payment-mollie` provider.
 */
export class MollieIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = ProviderKeys.MOLLIE

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default MollieIntegrationProvider
