import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import {
  applyIntegrationSectionStep,
  upsertIntegrationRecordStep,
  emitIntegrationEventStep,
  getIntegrationSnapshotStep,
  recordIntegrationChangeStep,
} from "../steps"
import type { DiffEntry, IntegrationChangeActor } from "../../../types/integration/history"

export type UpsertIntegrationWorkflowInput = {
  provider_id: string
  section_id?: string | null
  title?: string | null
  values: Record<string, unknown>
  /**
   * Merged into the stored metadata key by key, as on any Medusa entity: `""` removes a key, `null`
   * clears it all. Omitted → kept. Not part of the settings, so the change history doesn't record it.
   */
  metadata?: Record<string, unknown> | null
  /** Who makes the change, for the change history. Defaults to `{ type: "system" }`. */
  actor?: IntegrationChangeActor
}

export const upsertIntegrationWorkflowId = "upsert-integration"

export const upsertIntegrationWorkflow = createWorkflow(
  upsertIntegrationWorkflowId,
  function (input: UpsertIntegrationWorkflowInput) {
    const snapshot = getIntegrationSnapshotStep({ provider_id: input.provider_id })

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
      ...(data.input.metadata !== undefined ? { metadata: data.input.metadata } : {}),
    }))

    const record = upsertIntegrationRecordStep(recordInput)

    const change = transform({ input, snapshot, prepared }, (d) => {
      const diff: DiffEntry[] = []
      const nextTitle = d.input.title === undefined ? d.snapshot.title : d.input.title ?? null
      if (nextTitle !== d.snapshot.title) diff.push({ field: "@title", from: d.snapshot.title, to: nextTitle })
      diff.push(...d.prepared.diff)
      return {
        provider_id: d.input.provider_id,
        change_type: d.snapshot.existed ? ("updated" as const) : ("created" as const),
        actor: d.input.actor ?? null,
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
