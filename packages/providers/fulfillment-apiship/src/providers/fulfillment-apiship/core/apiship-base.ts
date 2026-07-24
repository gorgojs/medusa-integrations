import {
  AbstractFulfillmentProviderService,
  isDefined
} from "@medusajs/framework/utils"
import { createTelemetryClient } from "@gorgo/telemetry"
import {
  Logger,
  CalculateShippingOptionPriceDTO,
  CalculatedShippingOptionPrice,
  CreateShippingOptionDTO,
  CreateFulfillmentResult,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOrderDTO,
} from "@medusajs/framework/types"
import {
  type TariffObject,
} from "../../../lib/apiship-client"
import {
  createApishipClient,
  type ApishipClient,
} from "../../../lib/client"
import type {
  ApishipOptionsDTO,
  DeepPartial,
} from "../../../types/apiship"
import {
  getCheapestTariff,
  mapToApishipOrderRequest,
  mapToApishipCalculatorRequest,
  hashObject
} from "../utils"
import {
  getApishipClientConfigWorkflow,
  getApishipOptionsWorkflow,
  getShippingOptionWorkflow,
  getStockLocationWorkflow,
  getCalculationWorkflow,
  saveCalculationWorkflow
} from "../../../workflows"
type InjectedDependencies = {
  logger: Logger
}
import axios, { AxiosError } from "axios"

class ApishipBase extends AbstractFulfillmentProviderService {
  private static telemetry_ = createTelemetryClient({ packageDir: __dirname })
  protected logger_: Logger

  static validateOptions(): void {
    ApishipBase.telemetry_.track("plugin.started")
  }

  constructor({ logger }: InjectedDependencies, _options: unknown) {
    super()
    this.logger_ = logger
  }

  private async getApishipClient_(): Promise<ApishipClient> {
    const { result: apishipClientConfig } =
      await getApishipClientConfigWorkflow().run()

    return createApishipClient(apishipClientConfig)
  }

  private normalizeApishipOptions_(
    apishipOptions: DeepPartial<ApishipOptionsDTO>
  ): ApishipOptionsDTO {
    if (!apishipOptions.token?.trim()) {
      throw new Error("Apiship token is required")
    }

    if (apishipOptions.is_test === undefined) {
      throw new Error("Apiship is_test flag is required")
    }

    return {
      token: apishipOptions.token,
      is_test: apishipOptions.is_test,
      settings: {
        connections: (apishipOptions.settings?.connections ?? []).flatMap(
          (connection) => {
            if (
              !connection?.id ||
              !connection.name ||
              !connection.provider_key ||
              !connection.provider_connect_id ||
              connection.is_enabled === undefined
            ) {
              return []
            }

            return [
              {
                id: connection.id,
                name: connection.name,
                provider_key: connection.provider_key,
                provider_connect_id: connection.provider_connect_id,
                point_in_id: connection.point_in_id,
                point_in_address: connection.point_in_address,
                is_enabled: connection.is_enabled,
              },
            ]
          }
        ),
        default_sender_settings: {
          country_code:
            apishipOptions.settings?.default_sender_settings?.country_code ?? "",
          address_string:
            apishipOptions.settings?.default_sender_settings?.address_string ??
            "",
          contact_name:
            apishipOptions.settings?.default_sender_settings?.contact_name ?? "",
          phone: apishipOptions.settings?.default_sender_settings?.phone ?? "",
        },
        default_product_sizes: {
          length:
            apishipOptions.settings?.default_product_sizes?.length ?? 10,
          width: apishipOptions.settings?.default_product_sizes?.width ?? 10,
          height:
            apishipOptions.settings?.default_product_sizes?.height ?? 10,
          weight:
            apishipOptions.settings?.default_product_sizes?.weight ?? 20,
        },
        delivery_cost_vat:
          apishipOptions.settings?.delivery_cost_vat ??
          (-1 as ApishipOptionsDTO["settings"]["delivery_cost_vat"]),
        is_cod: apishipOptions.settings?.is_cod ?? false,
      },
    }
  }

  private assertOrderOptions_(apishipOptions: ApishipOptionsDTO) {
    const defaultSenderSettings =
      apishipOptions.settings.default_sender_settings

    if (!defaultSenderSettings.country_code) {
      throw new Error(
        "Apiship settings.default_sender_settings.country_code is required"
      )
    }

    if (!defaultSenderSettings.address_string) {
      throw new Error(
        "Apiship settings.default_sender_settings.address_string is required"
      )
    }

    if (!defaultSenderSettings.contact_name) {
      throw new Error(
        "Apiship settings.default_sender_settings.contact_name is required"
      )
    }

    if (!defaultSenderSettings.phone) {
      throw new Error(
        "Apiship settings.default_sender_settings.phone is required"
      )
    }
  }

  private async getApishipOptions_(): Promise<ApishipOptionsDTO> {
    const { result: apishipOptions } = await getApishipOptionsWorkflow().run()
    return this.normalizeApishipOptions_(apishipOptions)
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    this.logger_.debug(`Apiship.calculatePrice input: ${JSON.stringify({ optionData, data, context }, null, 2)}`)
    const [apishipClient, apishipOptions] = await Promise.all([
      this.getApishipClient_(),
      this.getApishipOptions_(),
    ])
    const calculatorRequest = mapToApishipCalculatorRequest(
      optionData,
      context,
      apishipOptions
    )

    const shippingOptionId = optionData.id as string
    const cartId = context.id as string
    const hash = hashObject({
      cartId,
      ...calculatorRequest
    })
    const key = `apiship:calc:${hash}:${shippingOptionId}`

    const { result: cache } = await getCalculationWorkflow().run({
      input: { key },
    })

    let tariffs: any
    if (cache) {
      this.logger_.debug(`There is a record with a key: ${key} in cache`)
      tariffs = cache
    } else {
      try {
        const { data: response } = await apishipClient.calculatorApi.getCalculator({
          calculatorRequest
        })
        tariffs = response

        await saveCalculationWorkflow().run({
          input: { key, data: tariffs },
        })
      } catch (error) {
        throw this.buildError("An error occurred in calculatePrice", error as any)
      }
    }

    const apishipData = (data as any)?.apishipData
    const chosenTariff = apishipData?.tariff
    let price: number | null = null

    if (chosenTariff && typeof chosenTariff.deliveryCost === "number") {
      price = chosenTariff.deliveryCost
    }
    if (price === null) {
      const cheapestTariff = getCheapestTariff(tariffs, optionData.deliveryType as number)
      price = cheapestTariff.deliveryCost as number
    }
    const result = {
      calculated_amount: price,
      is_calculated_price_tax_inclusive: true,
      data: tariffs,
    }

    this.logger_.debug(`Apiship.calculatePrice output: ${JSON.stringify(result, null, 2)}`)
    return result
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  /**
   * Create a new order.
   */
  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    this.logger_.debug(`Apiship.createFulfillment input: ${JSON.stringify({ data, items, order, fulfillment }, null, 2)}`)
    const [apishipClient, apishipOptions] = await Promise.all([
      this.getApishipClient_(),
      this.getApishipOptions_(),
    ])
    this.assertOrderOptions_(apishipOptions)

    const locationId = fulfillment.location_id as string
    const { result: stockLocation } = await getStockLocationWorkflow()
      .run({
        input: {
          id: locationId
        }
      })
    const { result: shippingOption } = await getShippingOptionWorkflow()
      .run({
        input: {
          id: fulfillment.shipping_option_id!
        }
      })
    const deliveryType = shippingOption.data?.deliveryType as number
    const pickupType = shippingOption.data?.pickupType as number
    const apishipData = data.apishipData as any
    const tariffId = apishipData?.tariff.tariffId
    const providerKey = apishipData?.tariff.providerKey
    const pointOutId = apishipData?.point?.id
      ? Number(apishipData.point.id)
      : undefined
    const apishipOrder = mapToApishipOrderRequest(
      apishipOptions,
      order!,
      stockLocation,
      providerKey,
      tariffId,
      deliveryType,
      pickupType,
      pointOutId
    )
    try {
      const response = await apishipClient.ordersApi.addOrder({
        orderRequest: apishipOrder,
      })
      const orderId = response.data.orderId
      const labels = await this.getShipmentDocuments({ orderId })
      const result: CreateFulfillmentResult = {
        data: {
          orderId,
          order: apishipOrder,
        },
        labels,
      }
      this.logger_.debug(
        `Apiship.createFulfillment output: ${JSON.stringify(result, null, 2)}`
      )
      return result
    } catch (e: any) {
      throw this.buildError("An error occurred in createFulfillment", e)
    }
  }

  async pickTariffId(providerKey: string): Promise<number> {
    this.logger_.debug(`Apiship.pickTariffId input: ${JSON.stringify(providerKey)}`)
    const fields = "id,tariffId,providerKey,name"
    const filter = `providerKey=${providerKey}`
    let rows: TariffObject[] | undefined
    try {
      this.logger_.debug(`Apiship.getListTariffs try filter: ${filter}`)
      const apishipClient = await this.getApishipClient_()
      const { data: response } = await apishipClient.listsApi.getListTariffs({
        limit: 100,
        offset: 0,
        filter,
        fields
      })
      const r = response.rows || []
      if (r.length) {
        rows = r as TariffObject[]
      }
    } catch (e: any) {
      this.logger_.debug(`Apiship.getListTariffs failed with "${filter}": ${e?.message ?? e}`)
    }
    if (!rows?.length) {
      throw new Error(`No current tariffs found for ProviderKey=${providerKey}`)
    }
    const tarrif = rows[0]
    const id = tarrif.id
    if (!id) {
      throw new Error(`Failed to retrieve tariffId from the first tariff (providerKey=${providerKey})`)
    }
    this.logger_.debug(`Apiship.pickTariffId output: ${id} (${tarrif.name})`)
    return Number(id)
  }

  /**
   * Cancel an existing order.
   */
  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    this.logger_.debug(`Apiship.cancelFulfillment input: ${JSON.stringify(data, null, 2)}`)
    const orderId = data?.orderId as number
    try {
      const apishipClient = await this.getApishipClient_()
      const response = await apishipClient.ordersApi.cancelOrder({ orderId })
      this.logger_.debug(`Apiship.cancelFulfillment output: ${JSON.stringify(response, null, 2)}`)
      return response
    } catch (e: any) {
      throw this.buildError("An error occurred in cancelFulfillment", e)
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  /**
   * Execute API call with retries.
   */
  private async executeWithRetry<T>({
    apiCall,
    isReady,
    maxAttempts = 10,
    baseDelay = 500,
    label,
  }: {
    apiCall: () => Promise<T>
    isReady: (res: T) => boolean
    maxAttempts?: number
    baseDelay?: number
    label?: string
  }): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await apiCall()
        if (isReady(response)) return response
        this.logger_.debug(`${label}: not ready (attempt ${attempt}/${maxAttempts})`)
      } catch (err: any) {
        this.logger_.debug(`${label}: error on attempt ${attempt}: ${err?.message ?? err}`)
      }
      if (attempt < maxAttempts) {
        const delay =
          baseDelay *
          Math.pow(2, attempt - 1) *
          (0.5 + Math.random() * 0.5)
        await this.sleep(delay)
      }
    }

    throw new Error(`${label}: data not ready after ${maxAttempts} attempts`)
  }

  /**
   * Retrieve an order information.
   */
  private async waitForOrderInfo(
    orderId: number,
    apishipClient?: ApishipClient
  ): Promise<{ trackingNumber: string; trackingUrl: string }> {
    this.logger_.debug(`Apiship.waitForOrderInfo input: ${orderId}`)
    const client = apishipClient ?? await this.getApishipClient_()

    const response = await this.executeWithRetry({
      apiCall: () => client.ordersApi.getOrderInfo({ orderId }),
      isReady: (response: any) => Boolean(response?.data?.order?.providerNumber),
      label: `orderInfo:${orderId}`,
    })
    const order = (response as any).data.order
    const result = {
      trackingNumber: String(order.providerNumber),
      trackingUrl: String(order.trackingUrl ?? ""),
    }
    this.logger_.debug(`Apiship.waitForOrderInfo output: ${JSON.stringify(result, null, 2)}`)

    return result
  }

  /**
   * Retrieve a labels for orders.
   */
  private async waitForLabelUrl(
    orderId: number,
    apishipClient?: ApishipClient
  ): Promise<string> {
    this.logger_.debug(`Apiship.waitForLabelUrl input: ${orderId}`)
    const client = apishipClient ?? await this.getApishipClient_()

    const response = await this.executeWithRetry({
      apiCall: () => client.orderDocsApi.getLabels({
        labelsRequest: {
          orderIds: [orderId],
          format: "pdf"
        }
      }),
      isReady: (response: any) => Boolean(response?.data?.url),
      label: `labels:${orderId}`,
    })
    const result = String((response as any).data.url)
    this.logger_.debug(`Apiship.waitForLabelUrl output: ${result}`)

    return result
  }

  /**
   * Retrieve a trcking information for orders.
   */
  async getShipmentDocuments(data: Record<string, unknown>): Promise<never[]> {
    this.logger_.debug(`Apiship.getShipmentDocuments input: ${JSON.stringify(data, null, 2)}`)

    const orderId = data?.orderId as number
    try {
      const apishipClient = await this.getApishipClient_()
      const { trackingNumber, trackingUrl } = await this.waitForOrderInfo(
        orderId,
        apishipClient
      )
      const labelUrl = await this.waitForLabelUrl(orderId, apishipClient)
      const labels = [
        {
          tracking_number: String(trackingNumber),
          tracking_url: trackingUrl || "",
          label_url: labelUrl || "",
        },
      ]
      this.logger_.debug(`Apiship.getShipmentDocuments output: ${JSON.stringify(labels, null, 2)}`)
      return labels as unknown as never[]
    } catch (e: any) {
      this.logger_.error(`[Apiship.getShipmentDocuments error: ${e?.message ?? e}`)
      throw new Error(`Apiship.getShipmentDocuments failed: ${e?.message ?? e}`)
    }
  }

  /**
   * Create a return order.
   */
  async createReturnFulfillment(fulfillment: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    this.logger_.debug(`Apiship.createReturnFulfillment input: ${JSON.stringify(fulfillment, null, 2)}`)

    return { data: {}, labels: [] } as CreateFulfillmentResult
  }

  /**
   * Retrieve waybills for orders.
   */
  async getFulfillmentDocuments(data: any): Promise<never[]> {
    this.logger_.debug(`Apiship.getFulfillmentDocuments input: ${JSON.stringify(data, null, 2)}`)

    const orderId = data.orderId as number
    const documentsRequest = {
      orderIds: [orderId],
      format: "pdf"
    }
    try {
      const apishipClient = await this.getApishipClient_()
      const { data: response } = await apishipClient.orderDocsApi.getWaybills({
        documentsRequest
      })
      const result = response?.waybillItems?.[0].file
      this.logger_.debug(`Apiship.getFulfillmentDocuments output: ${JSON.stringify(result, null, 2)}`)
      return result as unknown as never[]
    } catch (e: any) {
      throw this.buildError("An error occurred in getFulfillmentDocuments", e)
    }
  }

  async getReturnDocuments(data: any): Promise<never[]> {
    this.logger_.debug(`Apiship.getReturnDocuments input: ${JSON.stringify(data, null, 2)}`)

    return [] as never[]
  }

  async retrieveDocuments(
    fulfillmentData: any,
    documentType: any
  ): Promise<void> {
    this.logger_.debug(`Apiship.retrieveDocuments input: ${JSON.stringify({ fulfillmentData, documentType }, null, 2)}`)

    return
  }

  async validateFulfillmentData(
    optionData: any,
    data: any,
    context: any
  ): Promise<any> {
    this.logger_.debug(`Apiship.validateFulfillmentData input: ${JSON.stringify({ optionData, data, context }, null, 2)}`)
    return data
  }

  async validateOption(data: any): Promise<boolean> {
    this.logger_.debug(`Apiship.validateOption input: ${JSON.stringify(data, null, 2)}`)

    if (!isDefined(data.id)) {
      this.logger_.error("Required option `id` is missing in shipping option data")
      return false
    }
    if (!isDefined(data.deliveryType)) {
      this.logger_.error("Required option `deliveryType` is missing in shipping option data")
      return false
    } else if (![1, 2].includes(data.deliveryType)) {
      this.logger_.error(`Invalid option \`deliveryType\` provided in shipping option data. Valid values are: ${[1, 2].join(", ")}`)
      return false
    }
    if (!isDefined(data.pickupType)) {
      this.logger_.error("Required option `pickupType` is missing in shipping option data")
      return false
    } else if (![1, 2].includes(data.pickupType)) {
      this.logger_.error(`Invalid option \`pickupType\` provided in shipping option data. Valid values are: ${[1, 2].join(", ")}`)
      return false
    }
    return true
  }

  /**
   * Helper to build errors with additional context.
   */
  protected buildError(message: string, error: Error | AxiosError): Error {
    if (axios.isAxiosError(error)) {
      return new Error(
        `${message}: ${error.response?.status} ${error.response?.data?.code} - ${error.response?.data?.description}`.trim()
      )
    }
    return new Error(
      `${message}: ${error.message}`.trim()
    )
  }
}

export default ApishipBase
