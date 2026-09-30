import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { getApishipOptionsStep } from "./steps/get-apiship-options"
import { validateApishipOptionsStep } from "./steps/validate-apiship-options"
import { resolveApishipProviderIdStep } from "./steps/resolve-apiship-provider-id"

import { createApishipClient } from "../lib/client"
import { fetchApishipPointsByIds } from "../lib/points"

export type FetchApishipPointsByIdsStepInput = {
  apishipClientConfig: {
    token: string
    isTest: boolean
  }
  provider_id: string
  point_ids: Array<number | string>
  fields?: string
}

export const fetchApishipPointsByIdsStep = createStep(
  "fetch-apiship-points-by-ids-step",
  async (
    { apishipClientConfig, provider_id, point_ids, fields }: FetchApishipPointsByIdsStepInput,
    { container }
  ) => {
    const { listsApi } = createApishipClient(apishipClientConfig)

    const points = await fetchApishipPointsByIds({
      listsApi,
      cache: container.resolve(Modules.CACHE),
      providerId: provider_id,
      pointIds: point_ids,
      fields,
    })

    return new StepResponse(points)
  }
)

export type GetApishipPointsByIdsWorkflowInput = {
  shipping_option_id: string
  point_ids: Array<number | string>
  fields?: string
}

export const getApishipPointsByIdsWorkflow = createWorkflow(
  "get-apiship-points-by-ids",
  (input: GetApishipPointsByIdsWorkflowInput) => {
    const providerId = resolveApishipProviderIdStep({
      shipping_option_id: input.shipping_option_id,
    })

    const apishipOptions = getApishipOptionsStep({ provider_id: providerId, mode: "resolved" })
    const apishipClientConfig = validateApishipOptionsStep({ apishipOptions })

    const points = fetchApishipPointsByIdsStep({
      apishipClientConfig,
      provider_id: providerId,
      point_ids: input.point_ids,
      fields: input.fields,
    })

    return new WorkflowResponse(points)
  }
)
