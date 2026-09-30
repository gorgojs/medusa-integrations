import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { calculateShippingOptionsPricesWorkflow } from "@medusajs/core-flows"
import {
  StoreApishipCalculation,
  StoreApishipCalculationResponse,
} from "../../../../../types/http"
import { StoreCalculateApishipShippingOptionType } from "../../validators"
import { getApishipPointsByIdsWorkflow } from "../../../../../workflows/get-apiship-points-by-ids"

const STORE_POINT_FIELDS = [
  "id",
  "providerKey",
  "name",
  "address",
  "description",
  "photos",
  "worktime",
  "timetable",
  "lat",
  "lng",
].join(",")

const collectPointIds = (calculation: StoreApishipCalculation) =>
  (calculation.deliveryToPoint ?? []).flatMap((group) =>
    (group.tariffs ?? []).flatMap((tariff) => tariff.pointIds ?? [])
  )

export const POST = async (
  req: MedusaRequest<StoreCalculateApishipShippingOptionType>,
  res: MedusaResponse<StoreApishipCalculationResponse>
) => {
  const { shipping_option_id } = req.params
  const { cart_id, include_points } = req.validatedBody

  const { result } = await calculateShippingOptionsPricesWorkflow(
    req.scope
  ).run({
    input: {
      cart_id,
      shipping_options: [
        {
          id: shipping_option_id,
          data: {},
        },
      ],
    },
  })

  const calculatedOption = result[0] as {
    data?: StoreApishipCalculation
  } | undefined
  const calculation: StoreApishipCalculation = calculatedOption?.data ?? {}

  if (!include_points) {
    res.status(200).json({
      calculation,
    })
    return
  }

  const { result: points } = await getApishipPointsByIdsWorkflow(
    req.scope
  ).run({
    input: {
      shipping_option_id,
      point_ids: collectPointIds(calculation),
      fields: STORE_POINT_FIELDS,
    },
  })

  res.status(200).json({
    calculation,
    points,
  })
}
