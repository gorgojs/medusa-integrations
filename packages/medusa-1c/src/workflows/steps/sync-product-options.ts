import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { createAndLinkProductOptionsToProductWorkflow } from "@medusajs/medusa/core-flows";

type ExistingOption = { id: string; title: string; values: { id: string; value: string }[] };
type OptionNeeded = { title: string; values: string[] };

export type SyncProductOptionsStepInput = {
  productId: string;
  existingOptions: ExistingOption[];
  optionsNeeded: OptionNeeded[];
}[];

export const syncProductOptionsStep = createStep(
  "sync-product-options-step",
  async (input: SyncProductOptionsStepInput, { container }) => {
    for (const { productId, existingOptions, optionsNeeded } of input) {
      const existingByTitle = new Map(existingOptions.map((o) => [o.title, o]));

      const add: Array<string | { title: string; values: string[] }> = [];
      const update: Array<{ product_option_id: string; add: { value: string }[] }> = [];

      for (const { title, values } of optionsNeeded) {
        const existing = existingByTitle.get(title);
        if (!existing) {
          add.push({ title, values });
          continue;
        }
        const existingValueStrings = new Set(existing.values.map((v) => v.value));
        const missing = values.filter((v) => !existingValueStrings.has(v));
        if (missing.length) {
          update.push({ product_option_id: existing.id, add: missing.map((value) => ({ value })) });
        }
      }

      if (!add.length && !update.length) continue;

      await createAndLinkProductOptionsToProductWorkflow(container).run({
        input: { product_id: productId, add, update },
      });
    }

    return new StepResponse({ ok: true });
  }
);
