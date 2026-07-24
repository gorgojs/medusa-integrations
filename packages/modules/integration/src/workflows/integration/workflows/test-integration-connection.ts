import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { runTestConnectionStep, emitIntegrationEventStep } from "../steps"

export type TestIntegrationConnectionWorkflowInput = {
  provider_id: string
}

export const testIntegrationConnectionWorkflowId = "test-integration-connection"

export const testIntegrationConnectionWorkflow = createWorkflow(
  testIntegrationConnectionWorkflowId,
  function (input: TestIntegrationConnectionWorkflowInput) {
    const result = runTestConnectionStep(
      transform({ input }, (d) => ({
        provider_id: d.input.provider_id,
      }))
    )
    emitIntegrationEventStep(
      transform({ input, result }, (d) => ({
        name: "integration.tested",
        data: {
          provider_id: d.input.provider_id,
          status: d.result.status,
          message: d.result.message,
        },
      }))
    )
    return new WorkflowResponse(result)
  }
)
