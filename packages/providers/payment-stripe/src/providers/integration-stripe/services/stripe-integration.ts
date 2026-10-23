import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput, TestConnectionResult } from "@gorgo/medusa-integration"
import { logger } from "@medusajs/framework/logger"
import { callStripe, getStripe, StripeApiError } from "../../../lib/stripe-client"
import { STRIPE_ICON } from "../icon"
import { ProviderKeys } from "../../../types"
import { statementDescriptorSuffixError } from "../../../utils/descriptor"
import { REQUIRED_WEBHOOK_EVENTS, WEBHOOK_PATH_PREFIX } from "../../../utils/webhook"

/** `test` or `live`, read from a key's prefix (`sk_test_…`, `rk_live_…`, `pk_test_…`). */
function keyMode(key: unknown): "test" | "live" | undefined {
  const match = typeof key === "string" ? /^(?:sk|rk|pk)_(test|live)_/.exec(key) : null
  return (match?.[1] as "test" | "live" | undefined) ?? undefined
}

const descriptor = defineIntegration({
  category: "payment",
  displayName: "stripe.name",
  description: "stripe.description",
  icon: STRIPE_ICON,
  supportsMultipleInstances: true,
  preferredLayoutId: "core:two-column",

  options: {
    secretKey: {
      type: "string",
      required: true,
      minLength: 1,
      pattern: "^(sk|rk)_(test|live)_\\S+$",
      secret: true,
      control: "secret",
      label: "stripe.fields.secretKey",
      hint: "stripe.hints.secretKey",
    },
    publishableKey: {
      type: "string",
      required: true,
      minLength: 1,
      pattern: "^pk_(test|live)_\\S+$",
      control: "text",
      label: "stripe.fields.publishableKey",
      hint: "stripe.hints.publishableKey",
      // a test publishable key with a live secret key would show the storefront a sandbox form
      validate: (value, ctx) => {
        const secretMode = keyMode(ctx.options.secretKey)
        const publishableMode = keyMode(value)
        if (secretMode && publishableMode && secretMode !== publishableMode) {
          ctx.addIssue({ message: `The publishable key is for ${publishableMode} mode and the secret key for ${secretMode} mode` })
        }
      },
    },
    webhookSecret: {
      type: "string",
      pattern: "^whsec_\\S+$",
      secret: true,
      control: "secret",
      label: "stripe.fields.webhookSecret",
      hint: "stripe.hints.webhookSecret",
    },
    capture: {
      type: "enum",
      values: ["automatic", "manual"],
      default: "automatic",
      control: "select",
      label: "stripe.fields.capture",
      hint: "stripe.hints.capture",
      valueLabels: {
        automatic: "stripe.captures.automatic",
        manual: "stripe.captures.manual",
      },
    },
    paymentMethodConfiguration: {
      type: "string",
      pattern: "^pmc_\\S+$",
      control: "text",
      label: "stripe.fields.paymentMethodConfiguration",
      hint: "stripe.hints.paymentMethodConfiguration",
    },
    paymentDescription: {
      type: "string",
      maxLength: 1000,
      control: "text",
      label: "stripe.fields.paymentDescription",
      hint: "stripe.hints.paymentDescription",
    },
    statementDescriptorSuffix: {
      type: "string",
      control: "text",
      label: "stripe.fields.statementDescriptorSuffix",
      hint: "stripe.hints.statementDescriptorSuffix",
      validate: (value, ctx) => {
        const error = value ? statementDescriptorSuffixError(value) : null
        if (error) {
          ctx.addIssue({ message: `Stripe accepts a statement descriptor with ${error}` })
        }
      },
    },
    sendReceiptEmail: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "stripe.fields.sendReceiptEmail",
      hint: "stripe.hints.sendReceiptEmail",
    },
  },

  sections: [
    {
      id: "credentials",
      title: "stripe.sections.credentials",
      options: ["secretKey", "publishableKey", "webhookSecret"],
    },
    {
      id: "behavior",
      title: "stripe.sections.behavior",
      column: "side",
      options: ["capture"],
    },
    {
      id: "checkout",
      title: "stripe.sections.checkout",
      options: ["paymentMethodConfiguration", "paymentDescription", "statementDescriptorSuffix", "sendReceiptEmail"],
    },
  ],

  // Calls Stripe with the secret key, then checks that a webhook endpoint for Medusa exists in the
  // key's mode and sends the events the provider needs. Never throws.
  testConnection: async ({ options }) => {
    if (typeof options.secretKey !== "string" || !options.secretKey) {
      return { status: "failed", message: "The secret key is missing" }
    }
    const stripe = getStripe(options.secretKey)

    try {
      await callStripe(logger, "listPaymentIntents", {}, () => stripe.paymentIntents.list({ limit: 1 }))
    } catch (error) {
      return failed(error)
    }
    if (!options.webhookSecret) {
      return { status: "passed" }
    }

    try {
      const endpoints = await callStripe(logger, "listWebhookEndpoints", {}, () => stripe.webhookEndpoints.list({ limit: 100 }))
      const medusa = endpoints.data.filter((endpoint) => endpoint.status === "enabled" && endpoint.url.includes(WEBHOOK_PATH_PREFIX))
      if (!medusa.length) {
        return {
          status: "failed",
          message: `No enabled webhook endpoint in this Stripe mode points at ${WEBHOOK_PATH_PREFIX}<id>`,
        }
      }
      const missing = (events: string[]) =>
        events.includes("*") ? [] : REQUIRED_WEBHOOK_EVENTS.filter((event) => !events.includes(event))
      if (medusa.some((endpoint) => missing(endpoint.enabled_events).length === 0)) {
        return { status: "passed" }
      }
      return { status: "failed", message: `The webhook endpoint does not send ${missing(medusa[0].enabled_events).join(", ")}` }
    } catch (error) {
      // a restricted key may not read webhook endpoints; the payments themselves still work
      if (error instanceof StripeApiError && error.stripeType === "StripePermissionError") {
        return { status: "passed" }
      }
      return failed(error)
    }
  },
})

function failed(error: unknown): TestConnectionResult {
  return { status: "failed", message: (error as Error)?.message ?? "Connection failed" }
}

export type StripeOptions = z.infer<typeof descriptor.optionsSchema>

/**
 * Integration-provider for Stripe: declares the options contract (identifier → `provider_id`
 * "int_stripe"). Payment behaviour lives in the separate `payment-stripe` provider.
 */
export class StripeIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = ProviderKeys.STRIPE

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default StripeIntegrationProvider
