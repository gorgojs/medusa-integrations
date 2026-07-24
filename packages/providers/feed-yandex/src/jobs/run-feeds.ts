import { MedusaContainer } from "@medusajs/framework/types"
import { runFeedsWorkflow } from "../workflows/run-feeds"

export default async function job(container: MedusaContainer) {
  const { result } = await runFeedsWorkflow(container).run({
    input: {
      ids: []
    },
  })
  
  if (result.length > 0) {
    const logger = container.resolve("logger")
    logger.info(`Feeds exported: ${result.length}`)
  }
}

export const config = {
  name: "run-feeds",
  schedule: "* * * * *",
}