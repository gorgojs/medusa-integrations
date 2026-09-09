import { MedusaContainer } from "@medusajs/framework/types"
import { syncApishipShipmentDocumentsWorkflow } from "../workflows/sync-apiship-shipment-documents"

export default async function job(container: MedusaContainer) {
  const { result } = await syncApishipShipmentDocumentsWorkflow(container).run({
    input: {},
  })

  if (result.updated > 0) {
    const logger = container.resolve("logger")
    logger.info(
      `Apiship: synced shipment documents for ${result.updated}/${result.checked} fulfillment(s)`
    )
  }
}

export const config = {
  name: "sync-apiship-shipment-documents",
  schedule: "*/5 * * * *",
}
