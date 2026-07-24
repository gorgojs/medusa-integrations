import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import type { DeepPartial, ApishipOptionsDTO } from "../../types/apiship"

type ValidateApishipOptionsStepInput = {
  apishipOptions: DeepPartial<ApishipOptionsDTO>
}


export const validateApishipOptionsStep = createStep(
  "validate-apiship-options",
  async ({ apishipOptions }: ValidateApishipOptionsStepInput) => {
    if (!apishipOptions.token || apishipOptions.is_test === undefined) {
      throw new Error("Apiship token and is_test are required")
    }
    return new StepResponse({
      token: apishipOptions.token,
      isTest: apishipOptions.is_test
    })
  }
)
