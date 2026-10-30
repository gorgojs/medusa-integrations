import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import {
  applyIntegrationSectionStep,
  upsertIntegrationRecordStep,
  emitIntegrationEventStep,
  getIntegrationStateStep,
  recordIntegrationChangeStep,
} from "../steps"
import type { DiffEntry, IntegrationChangeActor } from "../../../types/integration/history"

export type UpsertIntegrationWorkflowInput = {
  provider_id: string
  section_id?: string | null
  title?: string | null
  values: Record<string, unknown>
  /** Who makes the change, for the change history. Defaults to `{ type: "system" }`. */
  actor?: IntegrationChangeActor
}

export const upsertIntegrationWorkflowId = "upsert-integration"

export const upsertIntegrationWorkflow = createWorkflow(
  upsertIntegrationWorkflowId,
  function (input: UpsertIntegrationWorkflowInput) {
    const state = getIntegrationStateStep({ provider_id: input.provider_id })

    const prepared = applyIntegrationSectionStep({
      provider_id: input.provider_id,
      section_id: input.section_id ?? null,
      values: input.values,
    })

    const recordInput = transform({ input, prepared }, (data) => ({
      provider_id: data.input.provider_id,
      category: data.prepared.category,
      options: data.prepared.options,
      ...(data.input.title !== undefined ? { title: data.input.title } : {}),
    }))

    const record = upsertIntegrationRecordStep(recordInput)

    const change = transform({ input, state, prepared }, (d) => {
      const diff: DiffEntry[] = []
      const nextTitle = d.input.title === undefined ? d.state.title : d.input.title ?? null
      if (nextTitle !== d.state.title) diff.push({ field: "@title", from: d.state.title, to: nextTitle })
      diff.push(...d.prepared.diff)
      return {
        provider_id: d.input.provider_id,
        change_type: d.state.existed ? ("updated" as const) : ("created" as const),
        outcome: "succeeded" as const,
        actor: d.input.actor ?? null,
        section_id: d.input.section_id ?? null,
        diff,
      }
    })

    recordIntegrationChangeStep(change)

    emitIntegrationEventStep(
      transform({ input, change }, (d) => ({
        name: "integration.updated",
        data: {
          provider_id: d.input.provider_id,
          change: "update",
          actor: d.input.actor ? { type: d.input.actor.type, id: d.input.actor.id ?? null } : null,
          // Names only: values stay in the change history, secrets nowhere.
          fields: d.change.diff.map((e) => e.field),
        },
      }))
    )

    return new WorkflowResponse(record)
  }
)
