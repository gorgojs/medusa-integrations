import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { resolveIntegrationOptions } from "@gorgo/medusa-integration"
import { ProviderKeys } from "../types"
import type { StoredApishipOptions } from "../types/apiship"
import { assembleApishipOptions, assertApishipToken } from "../lib/apiship-options"
import { createApishipClient } from "../lib/client"
import { fetchShipmentDocuments } from "../lib/shipment-documents"

const SYNC_LIMIT = 50

export const syncApishipShipmentDocumentsStep = createStep(
  "sync-apiship-shipment-documents-step",
  async (_: void, { container }) => {
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    const logger = container.resolve("logger")

    const fulfillments = await fulfillmentModuleService.listFulfillments(
      {
        provider_id: { $like: `${ProviderKeys.APISHIP}_%` } as any,
        canceled_at: { $eq: null } as any,
      },
      {
        relations: ["labels"],
        take: SYNC_LIMIT,
        order: { created_at: "DESC" },
      }
    )

    const pending = fulfillments.filter(
      (fulfillment) =>
        !fulfillment.labels?.length && (fulfillment.data as any)?.orderId
    )

    let updated = 0
    for (const fulfillment of pending) {
      try {
        const instanceId = (fulfillment.data as any)?.instanceId ?? null
        const orderId = (fulfillment.data as any).orderId

        const stored = await resolveIntegrationOptions<StoredApishipOptions>({
          identifier: ProviderKeys.APISHIP,
          instance_id: instanceId,
        })
        const options = assembleApishipOptions(stored)
        assertApishipToken(options)
        const apishipClient = createApishipClient({
          token: options.token,
          isTest: options.is_test,
        })

        const labels = await fetchShipmentDocuments({
          apishipClient,
          orderId,
          logger,
          maxAttempts: 1,
        })

        if (Array.isArray(labels) && labels.length > 0) {
          await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
            labels,
          })
          updated += 1
        }
      } catch (e: any) {
        logger.debug(
          `Apiship sync: fulfillment ${fulfillment.id} still not ready: ${e?.message ?? e}`
        )
      }
    }

    return new StepResponse({ checked: pending.length, updated })
  }
)

export const syncApishipShipmentDocumentsWorkflow = createWorkflow(
  "sync-apiship-shipment-documents",
  () => {
    const result = syncApishipShipmentDocumentsStep()
    return new WorkflowResponse(result)
  }
)
