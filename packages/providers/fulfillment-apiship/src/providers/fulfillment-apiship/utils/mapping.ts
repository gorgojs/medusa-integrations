import {
  CustomerDTO,
  FulfillmentOrderDTO,
  ProductVariantDTO,
  StockLocationDTO,
  OrderShippingMethodTaxLineDTO,
  CalculateShippingOptionPriceDTO
} from "@medusajs/framework/types"
import {
  type OrderRequest,
  type CalculatorRequest,
  type CostPaymentMethodEnum,
  type ItemCostVatEnum,
} from "../../../lib/apiship-client"
import { ApishipOptionsDTO } from "../../../types/apiship"
import { MedusaError } from "@medusajs/framework/utils"

type OrderItem = NonNullable<FulfillmentOrderDTO["items"]>[number] & {
  variant?: ProductVariantDTO
  tax_lines?: OrderShippingMethodTaxLineDTO[];
}

type CartItem = NonNullable<CalculateShippingOptionPriceDTO["context"]["items"]>[number] & {
  variant?: {
    weight?: number | null
    height?: number | null
    length?: number | null
    width?: number | null
  }
}

const ITEM_LENGTH = 10
const ITEM_WIDTH = 10
const ITEM_HEIGHT = 10
const ITEM_WEIGHT = 20

function mapItemVatRateToEnum(item: OrderItem): ItemCostVatEnum {
  const rate = item?.tax_lines?.[0]?.rate
  if (rate === 0 || rate === 5 || rate === 7 || rate === 10 || rate === 20) {
    return rate as ItemCostVatEnum
  }
  return -1 as ItemCostVatEnum
}

export function mapToApishipOrderRequest(
  apishipOptions: ApishipOptionsDTO,
  order: Partial<FulfillmentOrderDTO> & { customer?: CustomerDTO },
  stockLocation: StockLocationDTO,
  providerKey: string,
  tariffId: number,
  deliveryType: number,
  pickupType: number,
  pointOutId?: number
): OrderRequest {
  const stolstockLocationAddress = stockLocation.address!
  const defaultSenderSettings = apishipOptions.settings.default_sender_settings
  const sender = {
    countryCode:
      stolstockLocationAddress.country_code || defaultSenderSettings.country_code,
    ...((stolstockLocationAddress.city && stolstockLocationAddress.address_1 && stolstockLocationAddress.address_2) ?
      { addressString: `${stolstockLocationAddress.city}, ${stolstockLocationAddress.address_1}, ${stolstockLocationAddress.address_2}` } :
      { addressString: defaultSenderSettings.address_string }),
    contactName: defaultSenderSettings.contact_name,
    phone: stolstockLocationAddress.phone || defaultSenderSettings.phone,
    ...(stolstockLocationAddress.province ? { region: stolstockLocationAddress.province } : {}),
    ...(stolstockLocationAddress.city ? { city: stolstockLocationAddress.city } : {}),
    ...(stolstockLocationAddress.company ? { companyName: stolstockLocationAddress.company } : {}),
    ...(stolstockLocationAddress.postal_code ? { postIndex: stolstockLocationAddress.postal_code } : {}),
  }

  const shippingAddress = order.shipping_address!
  const recipient = {
    countryCode: (shippingAddress.country_code!).toUpperCase(),
    postIndex: order.shipping_address?.postal_code,
    region: shippingAddress.province,
    city: shippingAddress.city,
    addressString: [
      shippingAddress.city,
      shippingAddress.address_1,
      shippingAddress.address_2,
    ].filter(Boolean).join(", "),
    contactName: [shippingAddress.first_name, shippingAddress.last_name].join(" ") as string,
    phone: shippingAddress.phone!,
    ...(shippingAddress.company ? { companyName: shippingAddress.company } : {}),
    ...(order.customer?.email ? { email: order.customer?.email } : {}),
  }

  const defaultProductSizes = apishipOptions.settings.default_product_sizes
  const items = (order.items ?? []) as OrderItem[]
  const placeItems = items!.map((item) => {
    const quantity = item.quantity
    const weight = item.variant?.weight
    const height = item.variant?.height
    const length = item.variant?.length
    const width = item.variant?.width
    const articul = item.variant?.sku ?? undefined
    const barcode = item.variant?.barcode ?? undefined
    const description = [item.title, item.subtitle].filter(Boolean).join(" ")
    const cost = apishipOptions.settings.is_cod ? item.unit_price : 0
    return {
      length: length ?? defaultProductSizes?.length ?? ITEM_LENGTH,
      width: width ?? defaultProductSizes?.width ?? ITEM_WIDTH,
      height: height ?? defaultProductSizes?.height ?? ITEM_HEIGHT,
      weight: weight ?? defaultProductSizes?.weight ?? ITEM_WEIGHT,
      description,
      quantity,
      cost,
      assessedCost: cost,
      costVat: mapItemVatRateToEnum(item),
      ...(articul !== undefined  ? { articul } : {}),
      ...(barcode !== undefined ? { barcode } : {}),
    }
  })

  const totalWeight = placeItems.reduce((sum, item) => {
    const quantity = item.quantity
    const weight = item.weight
    return sum + weight * quantity
  }, 0)
  const dimensions = placeItems.map((item) => {
    const height = item.height
    const width = item.width
    const length = item.length
    const quantity = item.quantity
    const sorted = [height, width, length].sort((a, b) => a - b)
    return {
      minSum: sorted[0] * quantity,
      mid: sorted[1],
      max: sorted[2],
    }
  })
  const placeHeight = dimensions.reduce((s, d) => s + d.minSum, 0)
  const placeLength = Math.max(...dimensions.map((d) => d.mid))
  const placeWidth = Math.max(...dimensions.map((d) => d.max))
  const place = {
    height: placeHeight,
    length: placeLength,
    width: placeWidth,
    weight: totalWeight,
    items: placeItems,
  }

  const deliveryCostVat = apishipOptions.settings.delivery_cost_vat
  const assessedCost =
    placeItems.reduce((sum, item) => {
      const assessedCost = item.assessedCost
      const quantity = item.quantity
      return sum + assessedCost * quantity
    }, 0)
  const itemsCost =
    placeItems.reduce((sum, item) => {
      const cost = item.cost
      const quantity = item.quantity
      return sum + cost * quantity
    }, 0)
  const codCost = apishipOptions.settings.is_cod ? itemsCost : 0
  const cost = {
    codCost,
    assessedCost,
    isDeliveryPayedByRecipient: false,
    ...(apishipOptions.settings.is_cod ? { deliveryCostVat } : {}),
    ...(apishipOptions.settings.is_cod
      ? { paymentMethod: 3 as CostPaymentMethodEnum }
      : {}),
  }

  const providerConnection = apishipOptions.settings.connections?.find(
    (connection) =>
      connection.provider_key === providerKey && connection.is_enabled
  )
  const providerConnectId = providerConnection?.provider_connect_id
  if (!providerConnectId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The `providerConnectId` parameter is missing or incorrectly specified."
    )
  }
  const apishipOrder: OrderRequest = {
    order: {
      providerKey,
      providerConnectId,
      tariffId,
      pickupType,
      deliveryType,
      clientNumber: order.shipping_address?.customer_id || `medusa-${Date.now()}`,
      weight: totalWeight,
      ...(deliveryType === 2 ? { pointOutId } : {}),
    },
    cost,
    sender,
    recipient,
    places: [place],
  }
  return apishipOrder
}

export function mapToApishipCalculatorRequest(
  optionData: CalculateShippingOptionPriceDTO["optionData"],
  context: CalculateShippingOptionPriceDTO["context"],
  apishipOptions: ApishipOptionsDTO,
): CalculatorRequest {
  const shippingAddress = context.shipping_address!
  const toAddress = {
    countryCode: shippingAddress.country_code!.toUpperCase(),
    index: shippingAddress?.postal_code,
    addressString: [
      shippingAddress.city,
      shippingAddress.address_1,
      shippingAddress.address_2,
    ].filter(Boolean).join(", "),
    region: shippingAddress.province!,
    city: shippingAddress.city!,
  }

  const stockLocationAddress = context.from_location!.address!
  const fromAddress = {
    countryCode: stockLocationAddress.country_code,
    index: stockLocationAddress.postal_code!,
    addressString: [
      stockLocationAddress.city,
      stockLocationAddress.address_1,
      stockLocationAddress.address_2,
    ].filter(Boolean).join(", "),
    region: stockLocationAddress.province!,
    city: stockLocationAddress.city!,
  }

  const items = context.items as CartItem[]
  const places = items.flatMap((item) => {
    const weight = item.variant?.weight ?? ITEM_WEIGHT
    const height = item.variant?.height ?? ITEM_HEIGHT
    const length = item.variant?.length ?? ITEM_LENGTH
    const width = item.variant?.width ?? ITEM_WIDTH
    const quantity = item.quantity as number
    return Array.from({ length: quantity }, () => ({
      height,
      length,
      width,
      weight,
    }))
  })

  const pickupTypes = [optionData.pickupType as number]
  const deliveryTypes = [optionData.deliveryType as number]

  const assessedCost = items.reduce((sum, item) => {
    const unitPrice = item.unit_price as number
    const quantity = item.quantity as number
    return sum + unitPrice * quantity
  }, 0)
  const codCost = apishipOptions.settings.is_cod ? assessedCost : 0
  const includeFees = false

  const calculatorRequest: CalculatorRequest = {
    to: toAddress as any,
    from: fromAddress as any,
    places,
    pickupTypes,
    deliveryTypes,
    assessedCost,
    codCost,
    includeFees,
  }
  return calculatorRequest
}
