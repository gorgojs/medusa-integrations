import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput, TestConnectionResult } from "@gorgo/medusa-integration"
import { logger } from "@medusajs/framework/logger"
import { PayPalApiError, PayPalClient } from "../../../lib/paypal-client"
import { PAYPAL_ICON } from "../icon"
import { ProviderKeys } from "../../../types"
import { REQUIRED_WEBHOOK_EVENTS } from "../../../utils/webhook"

const descriptor = defineIntegration({
  category: "payment",
  displayName: "paypal.name",
  description: "paypal.description",
  icon: PAYPAL_ICON,
  supportsMultipleInstances: true,
  preferredLayoutId: "core:two-column",

  options: {
    environment: {
      type: "enum",
      values: ["sandbox", "live"],
      default: "sandbox",
      control: "select",
      label: "paypal.fields.environment",
      hint: "paypal.hints.environment",
      valueLabels: {
        sandbox: "paypal.environments.sandbox",
        live: "paypal.environments.live",
      },
    },
    clientId: {
      type: "string",
      required: true,
      minLength: 1,
      control: "text",
      label: "paypal.fields.clientId",
      hint: "paypal.hints.clientId",
    },
    clientSecret: {
      type: "string",
      required: true,
      minLength: 1,
      secret: true,
      control: "secret",
      label: "paypal.fields.clientSecret",
      hint: "paypal.hints.clientSecret",
    },
    webhookId: {
      type: "string",
      control: "text",
      label: "paypal.fields.webhookId",
      hint: "paypal.hints.webhookId",
    },
    intent: {
      type: "enum",
      values: ["capture", "authorize"],
      default: "capture",
      control: "select",
      label: "paypal.fields.intent",
      hint: "paypal.hints.intent",
      valueLabels: {
        capture: "paypal.intents.capture",
        authorize: "paypal.intents.authorize",
      },
    },
    brandName: {
      type: "string",
      maxLength: 127,
      control: "text",
      label: "paypal.fields.brandName",
      hint: "paypal.hints.brandName",
    },
    landingPage: {
      type: "enum",
      values: ["NO_PREFERENCE", "LOGIN", "GUEST_CHECKOUT"],
      default: "NO_PREFERENCE",
      control: "select",
      label: "paypal.fields.landingPage",
      hint: "paypal.hints.landingPage",
      valueLabels: {
        NO_PREFERENCE: "paypal.landingPages.NO_PREFERENCE",
        LOGIN: "paypal.landingPages.LOGIN",
        GUEST_CHECKOUT: "paypal.landingPages.GUEST_CHECKOUT",
      },
    },
    softDescriptor: {
      type: "string",
      maxLength: 22,
      control: "text",
      label: "paypal.fields.softDescriptor",
      hint: "paypal.hints.softDescriptor",
    },
    sendItems: {
      type: "boolean",
      default: true,
      control: "switch",
      label: "paypal.fields.sendItems",
      hint: "paypal.hints.sendItems",
    },
  },

  sections: [
    {
      id: "credentials",
      title: "paypal.sections.credentials",
      options: ["environment", "clientId", "clientSecret", "webhookId"],
    },
    {
      id: "behavior",
      title: "paypal.sections.behavior",
      column: "side",
      options: ["intent"],
    },
    {
      id: "checkout",
      title: "paypal.sections.checkout",
      options: ["brandName", "landingPage", "softDescriptor", "sendItems"],
    },
  ],

  // Gets an access token for the chosen environment, then checks that the webhook exists in that
  // environment and listens to the events the provider needs. Never throws.
  testConnection: async ({ options }) => {
    if (!options.clientId || !options.clientSecret) {
      return { status: "failed", message: "Client ID or secret is missing" }
    }
    const client = new PayPalClient({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      environment: options.environment,
      logger,
    })

    try {
      await client.getAccessToken()
    } catch (error) {
      return failed(error)
    }
    if (!options.webhookId) {
      return { status: "passed" }
    }

    try {
      const webhook = await client.getWebhook(options.webhookId)
      const events = new Set((webhook.event_types ?? []).map((event) => event.name))
      const missing = events.has("*") ? [] : REQUIRED_WEBHOOK_EVENTS.filter((name) => !events.has(name))
      if (missing.length) {
        return { status: "failed", message: `The webhook is not subscribed to ${missing.join(", ")}` }
      }
      return { status: "passed" }
    } catch (error) {
      if (error instanceof PayPalApiError && error.status === 404) {
        return {
          status: "failed",
          message: `Webhook ${options.webhookId} was not found for this app in the ${options.environment} environment`,
        }
      }
      return failed(error)
    }
  },
})

function failed(error: unknown): TestConnectionResult {
  const description =
    error instanceof PayPalApiError ? (error.data as { error_description?: string } | undefined)?.error_description : undefined
  return { status: "failed", message: description ?? (error as Error)?.message ?? "Connection failed" }
}

export type PayPalOptions = z.infer<typeof descriptor.optionsSchema>

/**
 * Integration-provider for PayPal: declares the options contract (identifier → `provider_id`
 * "int_paypal"). Payment behaviour lives in the separate `payment-paypal` provider.
 */
export class PayPalIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = ProviderKeys.PAYPAL

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default PayPalIntegrationProvider
