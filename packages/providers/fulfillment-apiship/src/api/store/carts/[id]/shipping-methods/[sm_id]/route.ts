import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { removeShippingMethodFromCartWorkflow } from "../../../../../../workflows/remove-shipping-method-from-cart"
import { DeleteResponse } from "../../../../../../types/http/common"

export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse<DeleteResponse<"shipping_method">>
) => {
  const { id: cart_id, sm_id: shipping_method_id } = req.params

  await removeShippingMethodFromCartWorkflow(req.scope).run({
    input: {
      cart_id,
      shipping_method_id,
    },
  })

  res.status(200).json({
    id: shipping_method_id,
    object: "shipping_method",
    deleted: true,
  })
}
