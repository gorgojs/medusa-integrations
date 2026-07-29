import { createStep, createWorkflow, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration"
import { ApishipOptionsDTO, DEFAULT_APISHIP_PROVIDER_ID } from "../types/apiship"
import { upsertApishipConfigStep } from "./steps/upsert-apiship-config"

type Primitive = string | number | boolean | bigint | symbol | null | undefined

type DeepPartial<T> =
  T extends Primitive
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : { [K in keyof T]?: DeepPartial<T[K]> }

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v)
}

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch as any) ?? (base as any)
  }
  const out: Record<string, any> = { ...(base as any) }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    const prev = (out as any)[k]
    if (isPlainObject(prev) && isPlainObject(v)) {
      out[k] = deepMerge(prev, v)
    } else {
      out[k] = v
    }
  }
  return out as T
}

export type ComposeApishipDataStepInput = {
  provider_id?: string
  patch: DeepPartial<ApishipOptionsDTO>
}

const composeApishipDataStep = createStep(
  "compose-apiship-data-step",
  async ({ provider_id, patch }: ComposeApishipDataStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = (await service.getStoredValues(
      provider_id ?? DEFAULT_APISHIP_PROVIDER_ID
    )) as DeepPartial<ApishipOptionsDTO>
    const merged = deepMerge(existing, patch)
    return new StepResponse(merged)
  }
)

export type UpdateApishipOptionsWorkflowInput = {
  provider_id?: string
} & DeepPartial<ApishipOptionsDTO>

export const updateApishipOptionsWorkflow = createWorkflow(
  "update-apiship-options",
  ({ provider_id, ...patch }: UpdateApishipOptionsWorkflowInput) => {
    const merged = composeApishipDataStep({ provider_id, patch })
    upsertApishipConfigStep({ values: merged, provider_id })
  }
)
