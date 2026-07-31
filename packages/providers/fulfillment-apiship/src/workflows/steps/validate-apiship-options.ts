import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { assertApishipToken } from "../../lib/apiship-options"
import type { ApishipOptionsDTO } from "../../types/apiship"

type ValidateApishipOptionsStepInput = {
  apishipOptions: ApishipOptionsDTO
}

/**
 * Turn normalized options into an ApiShip client config. In `"resolved"` mode the token is
 * already guaranteed by the integration module; in `"stored"` (admin) mode it may still be
 * blank on a half-configured draft, which is what this guards.
 */
export const validateApishipOptionsStep = createStep(
  "validate-apiship-options",
  async ({ apishipOptions }: ValidateApishipOptionsStepInput) => {
    assertApishipToken(apishipOptions)
    return new StepResponse({
      token: apishipOptions.token,
      isTest: apishipOptions.is_test,
    })
  }
)
