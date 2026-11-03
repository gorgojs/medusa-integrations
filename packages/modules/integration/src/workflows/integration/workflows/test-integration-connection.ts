import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { runTestConnectionStep, emitIntegrationEventStep } from "../steps"
import type { IntegrationChangeActor } from "../../../types/integration/history"

export type TestIntegrationConnectionWorkflowInput = {
  provider_id: string
  /**
   * Who runs the test, passed on in the `integration.tested` event. A test is monitoring, not a
   * change of settings, so it is not recorded in the change history. The daily job passes
   * `{ type: "job" }`.
   */
  actor?: IntegrationChangeActor
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
          actor: d.input.actor ? { type: d.input.actor.type, id: d.input.actor.id ?? null } : null,
        },
      }))
    )
    return new WorkflowResponse(result)
  }
)
