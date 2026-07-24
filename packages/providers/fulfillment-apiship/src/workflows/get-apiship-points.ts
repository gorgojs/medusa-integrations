import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { getStoreStep } from "./steps/get-store"
import { getApishipOptionsStep } from "./steps/get-apiship-options"
import { validateApishipOptionsStep } from "./steps/validate-apiship-options"

import { createApishipClient } from "../lib/client"

export type FetchApishipPointsStepInput = {
  apishipClientConfig: {
    token: string
    isTest: boolean
  }
  filter?: string
  fields?: string
  limit?: number
  offset?: number
}

export const fetchApishipPointsStep = createStep(
  "fetch-apiship-points-step",
  async ({
    apishipClientConfig,
    filter,
    fields,
    limit,
    offset,
  }: FetchApishipPointsStepInput) => {
    const { listsApi } = createApishipClient(apishipClientConfig)

    const { data } = await listsApi.getListPoints({
      ...(filter !== undefined && { filter }),
      ...(fields !== undefined && { fields }),
      ...(limit !== undefined && { limit }),
      ...(offset !== undefined && { offset }),
    })

    return new StepResponse(data.rows ?? [])
  }
)

export type GetCachedOrFetchApishipPointsStepInput = {
  apishipClientConfig: {
    token: string
    isTest: boolean
  }
  key: string
  filter?: string
  fields?: string
  limit?: number
  offset?: number
}

export const getCachedOrFetchApishipPointsStep = createStep(
  "get-cached-or-fetch-apiship-points-step",
  async (
    {
      apishipClientConfig,
      key,
      filter,
      fields,
      limit,
      offset,
    }: GetCachedOrFetchApishipPointsStepInput,
    { container }
  ) => {
    const cache = container.resolve(Modules.CACHE)

    const cached = (await cache.get(key)) as Record<string, any>[] | null
    if (Array.isArray(cached) && cached.length > 0) {
      return new StepResponse(cached)
    }

    const { listsApi } = createApishipClient(apishipClientConfig)

    const { data } = await listsApi.getListPoints({
      ...(filter !== undefined && { filter }),
      ...(fields !== undefined && { fields }),
      ...(limit !== undefined && { limit }),
      ...(offset !== undefined && { offset }),
    })

    const points = data.rows ?? []

    if (points.length > 0) {
      await cache.set(key, points)
    }

    return new StepResponse(points)
  }
)

export type SelectApishipPointsWorkflowResultStepInput = {
  cached?: Record<string, any>[] | null
  direct?: Record<string, any>[] | null
}

export const selectApishipPointsWorkflowResultStep = createStep(
  "select-apiship-points-workflow-result-step",
  async ({
    cached,
    direct,
  }: SelectApishipPointsWorkflowResultStepInput) => {
    return new StepResponse(cached ?? direct ?? [])
  }
)

export type GetApishipPointsWorkflowInput = {
  key?: string
  filter?: string
  fields?: string
  limit?: number
  offset?: number
}

export const getApishipPointsWorkflow = createWorkflow(
  "get-apiship-points",
  (input: GetApishipPointsWorkflowInput) => {
    const store = getStoreStep()
    const apishipOptions = getApishipOptionsStep({ store })
    const apishipClientConfig = validateApishipOptionsStep({ apishipOptions })

    const cachedApishipPoints = when(
      input,
      (input) => !!input.key
    ).then(() => {
      return getCachedOrFetchApishipPointsStep({
        apishipClientConfig,
        key: input.key!,
        filter: input.filter,
        fields: input.fields,
        limit: input.limit,
        offset: input.offset,
      })
    })

    const directApishipPoints = when(
      input,
      (input) => !input.key
    ).then(() => {
      return fetchApishipPointsStep({
        apishipClientConfig,
        filter: input.filter,
        fields: input.fields,
        limit: input.limit,
        offset: input.offset,
      })
    })

    const output = selectApishipPointsWorkflowResultStep({
      cached: cachedApishipPoints,
      direct: directApishipPoints,
    })

    return new WorkflowResponse(output)
  }
)
