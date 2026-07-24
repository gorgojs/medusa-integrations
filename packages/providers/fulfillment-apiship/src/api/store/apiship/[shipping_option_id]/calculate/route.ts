import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { calculateShippingOptionsPricesWorkflow } from "@medusajs/core-flows"
import {
  StoreApishipCalculation,
  StoreApishipCalculationResponse,
} from "../../../../../types/http"
import { StoreCalculateApishipShippingOptionType } from "../../validators"

export const POST = async (
  req: MedusaRequest<StoreCalculateApishipShippingOptionType>,
  res: MedusaResponse<StoreApishipCalculationResponse>
) => {
  const { shipping_option_id } = req.params
  const { cart_id } = req.validatedBody

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

  res.status(200).json({
    calculation,
  })
}
