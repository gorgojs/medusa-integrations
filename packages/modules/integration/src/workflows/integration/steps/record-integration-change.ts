import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"
import type { DiffEntry, IntegrationChangeActor, IntegrationChangeType } from "../../../types/integration/history"

export type RecordIntegrationChangeStepInput = {
  provider_id: string
  change_type: IntegrationChangeType
  /** Absent when the workflow was run without one: recorded as `{ type: "system" }`. */
  actor?: IntegrationChangeActor | null
  section_id?: string | null
  diff?: DiffEntry[]
  /** Set by the workflow when nothing actually changed. */
  skip?: boolean
}

export function shouldRecordChange(input: RecordIntegrationChangeStepInput): boolean {
  if (input.skip) return false
  if (input.change_type === "updated" && !input.diff?.length) return false
  return true
}

/** The user's email or the API key's title, kept with the change in case either is deleted later. */
async function resolveActorLabel(container: MedusaContainer, actor: IntegrationChangeActor): Promise<string | null> {
  if (!actor.id || (actor.type !== "user" && actor.type !== "api-key")) return null
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    if (actor.type === "user") {
      const { data } = await query.graph({ entity: "user", fields: ["email"], filters: { id: actor.id } })
      return data[0]?.email ?? null
    }
    const { data } = await query.graph({ entity: "api_key", fields: ["title"], filters: { id: actor.id } })
    return data[0]?.title ?? null
  } catch {
    return null
  }
}

/**
 * Write one entry of the settings change history. Runs right after the step that changed the
 * integration and never fails the workflow: any error is logged and the change goes ahead
 * unrecorded. If the workflow rolls back after this step, the entry is removed again.
 */
export const recordIntegrationChangeStep = createStep(
  "record-integration-change",
  async (input: RecordIntegrationChangeStepInput, { container }) => {
    const actor: IntegrationChangeActor = input.actor ?? { type: "system" }
    if (!shouldRecordChange(input)) return new StepResponse(null, null)

    try {
      const integration: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
      const descriptor = integration.getProviderDescriptor(input.provider_id)
      const id = await integration.recordChange({
        provider_id: input.provider_id,
        change_type: input.change_type,
        actor,
        actor_label: await resolveActorLabel(container, actor),
        identifier: descriptor?.identifier ?? null,
        instance_id: descriptor?.instanceId ?? null,
        category: descriptor?.category ?? null,
        section_id: input.section_id ?? null,
        diff: input.diff ?? [],
      })
      return new StepResponse(id, id)
    } catch (e: any) {
      const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      logger.warn(`[integration] could not record a ${input.change_type} change for ${input.provider_id}: ${e?.message ?? e}`)
      return new StepResponse(null, null)
    }
  },
  async (id, { container }) => {
    if (!id) return
    try {
      const integration: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
      await integration.deleteIntegrationChanges(id)
    } catch {
      // the change it described was rolled back; a stray entry is not worth failing the rollback
    }
  }
)
