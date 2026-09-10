import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { getApishipOptionsStep } from "./steps/get-apiship-options"
import { validateApishipOptionsStep } from "./steps/validate-apiship-options"
import { createApishipClient } from "../lib/client"

export type FetchApishipTariffsStepInput = {
  apishipClientConfig: {
    token: string
    isTest: boolean
  }
  providerKey: string
}

export const fetchApishipTariffsStep = createStep(
  "fetch-apiship-tariffs-step",
  async ({ apishipClientConfig, providerKey }: FetchApishipTariffsStepInput) => {
    const { listsApi } = createApishipClient(apishipClientConfig)

    const { data } = await listsApi.getListTariffs({
      limit: 100,
      offset: 0,
      filter: `providerKey=${providerKey}`,
      fields: "id,providerKey,name,pickupType,deliveryType",
    })

    return new StepResponse(data.rows ?? [])
  }
)

export type GetApishipTariffsWorkflowInput = {
  provider_key: string
  provider_id?: string
}

export const getApishipTariffsWorkflow = createWorkflow(
  "get-apiship-tariffs",
  (input: GetApishipTariffsWorkflowInput) => {
    const apishipOptions = getApishipOptionsStep({ provider_id: input.provider_id })
    const apishipClientConfig = validateApishipOptionsStep({ apishipOptions })

    const tariffs = fetchApishipTariffsStep({
      apishipClientConfig,
      providerKey: input.provider_key,
    })

    return new WorkflowResponse(tariffs)
  }
)
