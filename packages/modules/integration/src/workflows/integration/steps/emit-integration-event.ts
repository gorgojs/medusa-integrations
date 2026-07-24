import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { IEventBusModuleService } from "@medusajs/framework/types"

export type EmitIntegrationEventStepInput = {
  name: string
  data: Record<string, unknown>
}

export const emitIntegrationEventStep = createStep(
  "emit-integration-event",
  async (input: EmitIntegrationEventStepInput, { container }) => {
    const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)
    await eventBus.emit({ name: input.name, data: input.data })
    return new StepResponse(void 0)
  }
)
