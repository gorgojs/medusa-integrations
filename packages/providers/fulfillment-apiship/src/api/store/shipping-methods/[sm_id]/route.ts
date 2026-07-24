import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { removeShippingMethodFromCartWorkflow } from "../../../../workflows/remove-shipping-method-from-cart"
import { DeleteResponse } from "../../../../types/http/common"

export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse<DeleteResponse<"shipping_method">>
) => {
  const id = req.params.sm_id

  await removeShippingMethodFromCartWorkflow(
    req.scope
  ).run({
    input: {
      shipping_method_ids: [id],
    },
  })

  res.status(200).json({
    id,
    object: "shipping_method",
    deleted: true,
  })
}
