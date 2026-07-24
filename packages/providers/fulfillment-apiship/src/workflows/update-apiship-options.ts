import { createStep, createWorkflow, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { updateStoresStep } from "@medusajs/medusa/core-flows"
import { ApishipOptionsDTO, FulfillmentProviderKeys } from "../types/apiship"
import { getStoreStep } from "./steps/get-store"

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
  store: {
    id: string
    metadata?: Record<string, any> | null
  }
  data: DeepPartial<ApishipOptionsDTO>
}

const composeApishipDataStep = createStep(
  "compose-apiship-data-step",
  async ({ store, data }: ComposeApishipDataStepInput) => {
    const existingMetadata = (store.metadata ?? {})
    const existingApiship = (existingMetadata?.apiship ?? {}) as DeepPartial<ApishipOptionsDTO>
    const mergedApiship = deepMerge(existingApiship, data)
    const nextMetadata = {
      ...existingMetadata,
      [FulfillmentProviderKeys.APISHIP]: mergedApiship,
    }
    return new StepResponse({
      storeId: store.id,
      metadata: nextMetadata,
    })
  }
)

export type UpdateApishipOptionsWorkflowInput = DeepPartial<ApishipOptionsDTO>

export const updateApishipOptionsWorkflow = createWorkflow(
  "update-apiship-options",
  (input: UpdateApishipOptionsWorkflowInput) => {
    const store = getStoreStep()
    const patchPayload = composeApishipDataStep({
      store,
      data: input,
    })
    updateStoresStep({
      selector: { id: patchPayload.storeId },
      update: { metadata: patchPayload.metadata },
    })
  }
)