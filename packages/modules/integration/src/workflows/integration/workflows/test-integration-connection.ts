import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { runTestConnectionStep, emitIntegrationEventStep, recordIntegrationChangeStep } from "../steps"
import type { IntegrationChangeActor } from "../../../types/integration/history"

export type TestIntegrationConnectionWorkflowInput = {
  provider_id: string
  /**
   * Who runs the test. Only a test run by a user or an API key is recorded in the change
   * history; the daily job passes `{ type: "job" }`.
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
    recordIntegrationChangeStep(
      transform({ input, result }, (d) => ({
        provider_id: d.input.provider_id,
        change_type: "connection_tested" as const,
        outcome: d.result.status === "passed" ? ("succeeded" as const) : ("failed" as const),
        actor: d.input.actor ?? null,
        message: d.result.message ?? null,
        // A provider that cannot test reports "skipped": nothing happened worth keeping.
        skip: d.result.status === "skipped",
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
