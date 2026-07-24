import type { OrdersApi, OrderDocsApi, ListsApi, CalculatorApi } from "../../../lib/apiship-client"

type ApishipClientBundle = {
  ordersApi: OrdersApi
  orderDocsApi: OrderDocsApi
  listsApi: ListsApi
  calculatorApi: CalculatorApi
}

const registry = new Map<string, ApishipClientBundle>()

export function registerApishipClient(
  providerId: string,
  bundle: ApishipClientBundle
) {
  registry.set(providerId, bundle)
}

export function getApishipClient(providerId = "apiship_apiship"): ApishipClientBundle {
  const client = registry.get(providerId)

  if (!client) {
    throw new Error(
      `ApiShip client for provider "${providerId}" is not initialized yet.`
    )
  }

  return client
}
