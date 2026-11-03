import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import {
  setIntegrationEnabledStep,
  emitIntegrationEventStep,
  getIntegrationStateStep,
  recordIntegrationChangeStep,
} from "../steps"
import type { IntegrationChangeActor } from "../../../types/integration/history"

export type SetIntegrationEnabledWorkflowInput = {
  provider_id: string
  is_enabled: boolean
  /** Who makes the change, for the change history. Defaults to `{ type: "system" }`. */
  actor?: IntegrationChangeActor
}

export const setIntegrationEnabledWorkflowId = "set-integration-enabled"

export const setIntegrationEnabledWorkflow = createWorkflow(
  setIntegrationEnabledWorkflowId,
  function (input: SetIntegrationEnabledWorkflowInput) {
    const state = getIntegrationStateStep({ provider_id: input.provider_id })

    const record = setIntegrationEnabledStep(
      transform({ input }, (d) => ({ provider_id: d.input.provider_id, is_enabled: d.input.is_enabled }))
    )

    recordIntegrationChangeStep(
      transform({ input, state }, (d) => ({
        provider_id: d.input.provider_id,
        change_type: d.input.is_enabled ? ("enabled" as const) : ("disabled" as const),
        actor: d.input.actor ?? null,
        // Switching to the state it is already in changes nothing.
        skip: d.state.is_enabled === d.input.is_enabled,
      }))
    )

    // `integration.updated` invalidates the resolved-options cache, so a disabled
    // integration stops resolving (and an enabled one starts) on the next read.
    emitIntegrationEventStep(
      transform({ input }, (d) => ({
        name: "integration.updated",
        data: {
          provider_id: d.input.provider_id,
          change: "enabled",
          actor: d.input.actor ? { type: d.input.actor.type, id: d.input.actor.id ?? null } : null,
        },
      }))
    )

    return new WorkflowResponse(record)
  }
)
