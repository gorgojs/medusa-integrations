import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { AdminApishipProvider } from "../types/http"
import { getStoreStep } from "./steps/get-store"
import { validateApishipOptionsStep } from "./steps/validate-apiship-options"
import { getApishipOptionsStep } from "./steps/get-apiship-options"
import { createApishipClient } from "../lib/client"

export type GetApishipProvidersFromCacheStepInput = {
  key: string
}

export const getApishipProvidersFromCacheStep = createStep(
  "get-apiship-providers-from-cache-step",
  async (
    { key }: GetApishipProvidersFromCacheStepInput,
    { container }
  ) => {
    const cachingModuleService = container.resolve(Modules.CACHE)

    const providers =
      (await cachingModuleService.get(key)) as AdminApishipProvider[] | null

    return new StepResponse(providers)
  }
)

export type FetchApishipProvidersStepInput = {
  apishipClientConfig: {
    token: string
    isTest: boolean
  }
}

export const fetchApishipProvidersStep = createStep(
  "fetch-apiship-providers-from-apiship-step",
  async ({ apishipClientConfig }: FetchApishipProvidersStepInput) => {
    const { listsApi } = createApishipClient(apishipClientConfig)
    const { data } = await listsApi.getListProviders({})

    if (!data.rows) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Failed to retrieve providers from ApiShip"
      )
    }

    const providers: AdminApishipProvider[] = data.rows

    return new StepResponse(providers)
  }
)

export type SaveProvidersToCacheStepInput = {
  key: string
  data: AdminApishipProvider[]
}

export const saveProvidersToCacheStep = createStep(
  "save-providers-to-cache-step",
  async ({ key, data }: SaveProvidersToCacheStepInput, { container }) => {
    const cachingModuleService = container.resolve(Modules.CACHE)

    await cachingModuleService.set(key, data)
  }
)

export type SelectProvidersResultStepInput = {
  cached: AdminApishipProvider[] | null
  fetched?: AdminApishipProvider[] | null
}

export const selectProvidersResultStep = createStep(
  "select-providers-result-step",
  async ({ cached, fetched }: SelectProvidersResultStepInput) => {
    return new StepResponse(cached ?? fetched ?? [])
  }
)

export const getApishipProvidersWorkflow = createWorkflow(
  "get-apiship-providers",
  () => {
    const key = "apiship:providers"
    const cachedProviders = getApishipProvidersFromCacheStep({ key })
    const store = getStoreStep()
    const apishipOptions = getApishipOptionsStep({ store })
    const apishipClientConfig = validateApishipOptionsStep({
      apishipOptions
    })

    const fetchedProviders = when(
      cachedProviders,
      (providers) => !providers
    ).then(() => {
      const result = fetchApishipProvidersStep({
        apishipClientConfig,
      })

      saveProvidersToCacheStep({
        key,
        data: result,
      })

      return result
    })

    const output = selectProvidersResultStep({
      cached: cachedProviders,
      fetched: fetchedProviders,
    })

    return new WorkflowResponse(output)
  }
)