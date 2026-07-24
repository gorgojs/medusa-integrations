import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type GetCalculationStepInput = {
  key: string
}

export const getCalculationStep = createStep(
  "get-calculation-step",
  async ({ key }: GetCalculationStepInput, { container }) => {
    const cachingModuleService = container.resolve(Modules.CACHE)
    const calculation = await cachingModuleService.get(
      key
    )
    return new StepResponse(calculation)
  }
)

type GetCalculationWorkflowInput = {
  key: string
}

export const getCalculationWorkflow = createWorkflow(
  "get-calculation",
  (input: GetCalculationWorkflowInput) => {
    const calculation = getCalculationStep(input)
    return new WorkflowResponse(calculation)
  }
)