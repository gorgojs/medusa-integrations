import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { INTEGRATION_MODULE } from "../modules/integration"
import type IntegrationModuleService from "../modules/integration/services/integration-module"

export default async function invalidateOptionsCache({
  event,
  container,
}: SubscriberArgs<{ provider_id: string }>) {
  const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
  service.clearOptionsCache(event.data.provider_id)
}

export const config: SubscriberConfig = {
  event: "integration.updated",
}
