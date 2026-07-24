import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { setIntegrationEnabledStep, emitIntegrationEventStep } from "../steps"

export type SetIntegrationEnabledWorkflowInput = {
  provider_id: string
  is_enabled: boolean
}

export const setIntegrationEnabledWorkflowId = "set-integration-enabled"

export const setIntegrationEnabledWorkflow = createWorkflow(
  setIntegrationEnabledWorkflowId,
  function (input: SetIntegrationEnabledWorkflowInput) {
    const record = setIntegrationEnabledStep(input)

    // `integration.updated` invalidates the resolved-options cache, so a disabled
    // integration stops resolving (and an enabled one starts) on the next read.
    emitIntegrationEventStep(
      transform({ input }, (d) => ({
        name: "integration.updated",
        data: {
          provider_id: d.input.provider_id,
          change: "enabled",
        },
      }))
    )

    return new WorkflowResponse(record)
  }
)
