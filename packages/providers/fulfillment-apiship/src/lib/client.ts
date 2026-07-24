import {
  Configuration,
  OrdersApi,
  OrderDocsApi,
  ListsApi,
  CalculatorApi,
  ConnectionsApi,
} from "./apiship-client"

export type ApishipClient = {
  configuration: Configuration
  ordersApi: OrdersApi
  orderDocsApi: OrderDocsApi
  listsApi: ListsApi
  calculatorApi: CalculatorApi
  connectionsApi: ConnectionsApi
}

export type ApishipClientConfig = {
  token: string
  isTest: boolean
}

export const createApishipClient = ({
  token,
  isTest,
}: ApishipClientConfig): ApishipClient => {
  const basePath = isTest
    ? "http://api.dev.apiship.ru/v1"
    : "https://api.apiship.ru/v1"

  const configuration = new Configuration({
    basePath,
    apiKey: token,
    baseOptions: {
      headers: {
        platform: "medusajs",
      },
    },
  })

  return {
    configuration,
    ordersApi: new OrdersApi(configuration),
    orderDocsApi: new OrderDocsApi(configuration),
    listsApi: new ListsApi(configuration),
    calculatorApi: new CalculatorApi(configuration),
    connectionsApi: new ConnectionsApi(configuration),
  }
}