import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { assembleApishipOptions } from "../../lib/apiship-options"
import { requireApishipIntegration } from "../../lib/integration"
import { apishipInstanceId } from "../../lib/provider-id"
import { ProviderKeys } from "../../types"
import type { StoredApishipOptions } from "../../types/apiship"

/**
 * - `"stored"` — the raw decrypted row, ungated. For ADMIN reads and read-modify-write:
 *   an integration is configured before it is complete/enabled, and the admin UI must be
 *   able to see (and edit) that draft.
 * - `"resolved"` — the integration module's resolver: gated on `is_enabled` + full
 *   descriptor validation, with defaults applied and a 60s cache. For STORE and runtime
 *   reads, so a disabled or half-configured integration is invisible to shoppers.
 */
export type GetApishipOptionsMode = "stored" | "resolved"

export type GetApishipOptionsStepInput = {
  provider_id?: string
  mode?: GetApishipOptionsMode
}

export const getApishipOptionsStep = createStep(
  "get-apiship-options-step",
  async (
    { provider_id, mode = "stored" }: GetApishipOptionsStepInput = {},
    { container }
  ) => {
    const { service, providerId } = requireApishipIntegration(container, provider_id)

    if (mode === "resolved") {
      const resolved = await service.getResolvedOptions(
        ProviderKeys.APISHIP,
        apishipInstanceId(providerId)
      )
      if (!resolved) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `ApiShip integration "${providerId}" is not available: it is either not configured, disabled, or missing required options.`
        )
      }
      return new StepResponse(
        assembleApishipOptions(resolved.options as StoredApishipOptions)
      )
    }

    const stored = (await service.getStoredValues(providerId)) as StoredApishipOptions
    return new StepResponse(assembleApishipOptions(stored))
  }
)
