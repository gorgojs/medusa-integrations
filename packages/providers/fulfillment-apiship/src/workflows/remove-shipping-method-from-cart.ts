import {
  createStep,
  createWorkflow,
  parallelize,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { CartWorkflowEvents, MedusaError } from "@medusajs/framework/utils"
import {
  acquireLockStep,
  emitEventStep,
  refreshCartItemsWorkflow,
  releaseLockStep,
  removeShippingMethodFromCartStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"

export type RemoveShippingMethodFromCartWorkflowInput = {
  cart_id: string
  shipping_method_id: string
}

type CartWithShippingMethods = {
  id: string
  completed_at?: string | Date | null
  shipping_methods?: Array<{ id: string } | null> | null
}

export const validateShippingMethodInCartStep = createStep(
  "validate-shipping-method-in-cart",
  async ({
    cart,
    shipping_method_id,
  }: {
    cart: CartWithShippingMethods
    shipping_method_id: string
  }) => {
    if (cart.completed_at) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cart ${cart.id} is already completed`
      )
    }

    const belongsToCart = (cart.shipping_methods ?? []).some(
      (method) => method?.id === shipping_method_id
    )

    if (!belongsToCart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Shipping method with id: ${shipping_method_id} was not found in cart ${cart.id}`
      )
    }

    return new StepResponse(void 0)
  }
)

export const removeShippingMethodFromCartWorkflow = createWorkflow(
  "remove-shipping-method-from-cart",
  (input: RemoveShippingMethodFromCartWorkflowInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "completed_at", "shipping_methods.id"],
      filters: { id: input.cart_id },
      options: { throwIfKeyNotFound: true },
    })

    const cart = transform({ carts }, ({ carts }) => carts[0] as CartWithShippingMethods)

    validateShippingMethodInCartStep({
      cart,
      shipping_method_id: input.shipping_method_id,
    })

    removeShippingMethodFromCartStep({
      shipping_method_ids: [input.shipping_method_id],
    })

    refreshCartItemsWorkflow.runAsStep({
      input: { cart_id: input.cart_id },
    })

    parallelize(
      emitEventStep({
        eventName: CartWorkflowEvents.UPDATED,
        data: { id: input.cart_id },
      }),
      releaseLockStep({
        key: input.cart_id,
      })
    )

    return new WorkflowResponse(void 0)
  }
)
