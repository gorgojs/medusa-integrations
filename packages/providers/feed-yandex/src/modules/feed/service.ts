import { MedusaService } from "@medusajs/framework/utils"
import { createTelemetryClient } from "@gorgo/telemetry"
import Feed from "./models/feed"

class FeedModuleService extends MedusaService({
  Feed
}) {
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })

  constructor(...args: any[]) {
    super(...args)
    FeedModuleService.telemetry_.track("plugin.started")
  }
}

export default FeedModuleService
