import {
  createStep,
  createWorkflow
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type SaveCalculationStepInput = {
  key: string
  data: Record<string, unknown>
}

export const saveCalculationStep = createStep(
  "save-calculation-step",
  async ({key, data}: SaveCalculationStepInput, { container }) => {
    const cachingModuleService = container.resolve(Modules.CACHE)
    await cachingModuleService.set(
      key,
      data
    )
  }
)

type SaveCalculationWorkflowInput = {
  key: string
  data: Record<string, unknown>
}

export const saveCalculationWorkflow = createWorkflow(
  "save-calculation",
  (input: SaveCalculationWorkflowInput) => {
    saveCalculationStep(input)
  }
)