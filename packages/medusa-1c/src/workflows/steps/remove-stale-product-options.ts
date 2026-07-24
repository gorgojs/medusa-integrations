import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { createAndLinkProductOptionsToProductWorkflow } from "@medusajs/medusa/core-flows";

export type RemoveStaleProductOptionsStepInput = { productId: string; optionId: string }[];

export const removeStaleProductOptionsStep = createStep(
  "remove-stale-product-options-step",
  async (input: RemoveStaleProductOptionsStepInput, { container }) => {
    for (const { productId, optionId } of input) {
      await createAndLinkProductOptionsToProductWorkflow(container).run({
        input: { product_id: productId, remove: [optionId] },
      });
    }

    return new StepResponse({ ok: true });
  }
);
