import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AuthorizeNetClient } from "../../lib/authorizenet-client"
import { resolveAuthorizeNetOptions } from "../../lib/integration"
import { buildStorefrontConfig } from "../../lib/storefront-config"
import type { StoreAuthorizeNetConfig } from "../../types/http"

export type GetAuthorizeNetConfigStepInput = {
  provider_id?: string
}

/**
 * The public settings the storefront needs to run Accept.js and the Google Pay button. The secrets
 * are used on the server to read the gateway id and never leave the step.
 */
export const getAuthorizeNetConfigStep = createStep(
  "authorizenet-get-config-step",
  async ({ provider_id }: GetAuthorizeNetConfigStepInput, { container }) => {
    const { providerId, options } = await resolveAuthorizeNetOptions(container, provider_id)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const client = new AuthorizeNetClient({
      environment: options.environment ?? "sandbox",
      apiLoginId: options.apiLoginId,
      transactionKey: options.transactionKey,
      logger,
    })
    const config: StoreAuthorizeNetConfig = await buildStorefrontConfig({ providerId, options, client, logger })
    return new StepResponse(config)
  }
)
