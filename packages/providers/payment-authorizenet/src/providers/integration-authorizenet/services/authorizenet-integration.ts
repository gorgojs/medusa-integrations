import { AbstractIntegrationProvider, defineIntegration, z } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput, TestConnectionResult } from "@gorgo/medusa-integration"
import { logger } from "@medusajs/framework/logger"
import { asArray, AuthorizeNetClient } from "../../../lib/authorizenet-client"
import { ProviderKeys } from "../../../types"
import type { AnetEnvironment } from "../../../types"
import { REQUIRED_WEBHOOK_EVENTS, WEBHOOK_PATH_PREFIX } from "../../../utils/webhook"
import { AUTHORIZENET_ICON } from "../icon"

const descriptor = defineIntegration({
  category: "payment",
  displayName: "authorizenet.name",
  description: "authorizenet.description",
  icon: AUTHORIZENET_ICON,
  supportsMultipleInstances: true,
  preferredLayoutId: "core:two-column",

  options: {
    environment: {
      type: "enum",
      values: ["sandbox", "production"],
      default: "sandbox",
      control: "select",
      label: "authorizenet.fields.environment",
      hint: "authorizenet.hints.environment",
      valueLabels: {
        sandbox: "authorizenet.environments.sandbox",
        production: "authorizenet.environments.production",
      },
    },
    apiLoginId: {
      type: "string",
      required: true,
      minLength: 1,
      control: "text",
      label: "authorizenet.fields.apiLoginId",
      hint: "authorizenet.hints.apiLoginId",
    },
    transactionKey: {
      type: "string",
      required: true,
      minLength: 1,
      secret: true,
      control: "secret",
      label: "authorizenet.fields.transactionKey",
      hint: "authorizenet.hints.transactionKey",
    },
    publicClientKey: {
      type: "string",
      required: true,
      minLength: 1,
      control: "text",
      label: "authorizenet.fields.publicClientKey",
      hint: "authorizenet.hints.publicClientKey",
    },
    signatureKey: {
      type: "string",
      secret: true,
      control: "secret",
      label: "authorizenet.fields.signatureKey",
      hint: "authorizenet.hints.signatureKey",
    },
    capture: {
      type: "enum",
      values: ["automatic", "manual"],
      default: "automatic",
      control: "select",
      label: "authorizenet.fields.capture",
      hint: "authorizenet.hints.capture",
      valueLabels: {
        automatic: "authorizenet.captures.automatic",
        manual: "authorizenet.captures.manual",
      },
    },
    googlePay: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "authorizenet.fields.googlePay",
      hint: "authorizenet.hints.googlePay",
    },
    googleMerchantId: {
      type: "string",
      control: "text",
      label: "authorizenet.fields.googleMerchantId",
      hint: "authorizenet.hints.googleMerchantId",
      // Google Pay's production environment refuses a page without the merchant's Google ID
      validate: (value, ctx) => {
        if (ctx.options.googlePay === true && ctx.options.environment === "production" && !value) {
          ctx.addIssue({ message: "Google Pay in production needs your Google merchant ID" })
        }
      },
    },
  },

  sections: [
    {
      id: "credentials",
      title: "authorizenet.sections.credentials",
      options: ["environment", "apiLoginId", "transactionKey", "publicClientKey", "signatureKey"],
    },
    {
      id: "behavior",
      title: "authorizenet.sections.behavior",
      column: "side",
      options: ["capture"],
    },
    {
      id: "wallets",
      title: "authorizenet.sections.wallets",
      options: ["googlePay", "googleMerchantId"],
    },
  ],

  // Reads the account with the keys, then checks that a webhook for Medusa sends the events the
  // provider needs. Never throws.
  testConnection: async ({ options }) => {
    if (typeof options.apiLoginId !== "string" || !options.apiLoginId || typeof options.transactionKey !== "string" || !options.transactionKey) {
      return { status: "failed", message: "The API Login ID or the Transaction Key is missing" }
    }
    const environment = (options.environment as AnetEnvironment | undefined) ?? "sandbox"
    const client = new AuthorizeNetClient({
      environment,
      apiLoginId: options.apiLoginId,
      transactionKey: options.transactionKey,
      logger,
    })

    let summary: string
    try {
      const merchant = await client.getMerchantDetails()
      if (merchant.isTestMode) {
        return {
          status: "failed",
          message:
            "The Authorize.net account is in Test Mode, which keeps no transactions. Switch it to Live Mode in the Merchant Interface",
        }
      }
      const currencies = asArray(merchant.currencies as string | string[] | { currency?: string | string[] })
        .flatMap((entry) => (typeof entry === "string" ? [entry] : asArray(entry?.currency)))
        .join(", ")
      summary = [currencies && `Currencies: ${currencies}`, merchant.gatewayId && `Payment Gateway ID: ${merchant.gatewayId}`]
        .filter(Boolean)
        .join(". ")
    } catch (error) {
      return failed(error, `Check that the keys belong to the ${environment} environment`)
    }

    if (!options.signatureKey) {
      return { status: "passed", message: summary || undefined }
    }
    try {
      const medusa = (await client.listWebhooks()).filter(
        (webhook) => webhook.status === "active" && webhook.url?.includes(WEBHOOK_PATH_PREFIX)
      )
      if (!medusa.length) {
        return {
          status: "failed",
          message: `No active webhook in Authorize.net points at ${WEBHOOK_PATH_PREFIX}<id>`,
        }
      }
      const missing = (events: string[]) => REQUIRED_WEBHOOK_EVENTS.filter((event) => !events.includes(event))
      if (medusa.some((webhook) => missing(asArray(webhook.eventTypes)).length === 0)) {
        return { status: "passed", message: summary || undefined }
      }
      return {
        status: "failed",
        message: `The webhook does not send ${missing(asArray(medusa[0].eventTypes)).join(", ")}`,
      }
    } catch (error) {
      return failed(error)
    }
  },
})

function failed(error: unknown, advice?: string): TestConnectionResult {
  const message = (error as Error)?.message ?? "Connection failed"
  return { status: "failed", message: advice ? `${message}. ${advice}` : message }
}

export type AuthorizeNetOptions = z.infer<typeof descriptor.optionsSchema>

/**
 * Integration-provider for Authorize.net: declares the options contract (identifier → `provider_id`
 * "int_authorizenet"). Payment behaviour lives in the separate `payment-authorizenet` provider.
 */
export class AuthorizeNetIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = ProviderKeys.AUTHORIZENET

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default AuthorizeNetIntegrationProvider
