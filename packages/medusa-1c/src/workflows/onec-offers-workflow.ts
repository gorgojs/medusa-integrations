import {
  updateProductsWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { UpdateProductWorkflowInputDTO } from "@medusajs/framework/types";
import {
  CreateProductVariantWorkflowInputDTO,
  ProductDTO,
} from "@medusajs/types";
import { OnecExchangeWorkflowInput, OffersOutput } from "../types";
import { parseOffersFilesStep } from "./steps/parse-offers-files";
import {
  syncProductOptionsStep,
  SyncProductOptionsStepInput,
} from "./steps/sync-product-options";
import {
  removeStaleProductOptionsStep,
  RemoveStaleProductOptionsStepInput,
} from "./steps/remove-stale-product-options";

export const onecOffersWorkflow = createWorkflow(
  "onec-offers-workflow",
  (input: Pick<OnecExchangeWorkflowInput, "offers">) => {
    const offersData = parseOffersFilesStep(input.offers);

    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["default_currency_code"],
    }).config({ name: "stores" });

    const externalIdsFilters = transform({ offersData }, (data) => {
      const productIds = new Set<string>();
      data.offersData.offers.forEach((offer) => {
        productIds.add(offer.id!.split("#")[0]);
      });
      return Array.from(productIds);
    });

    const { data: existingProducts } = useQueryGraphStep({
      entity: "product",
      fields: [
        "id",
        "external_id",
        "variants.*",
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
      ],
      filters: { external_id: externalIdsFilters },
    }).config({ name: "existing-products" });

    const { productsToUpdate, optionsToSync, staleOptionsToRemove } = transform(
      {
        existingProducts,
        stores,
        offersData,
      },
      (data: {
        existingProducts: ProductDTO[];
        stores: {
          default_currency_code: string;
        }[];
        offersData: OffersOutput;
      }) => {
        const productsToUpdate: UpdateProductWorkflowInputDTO[] = [];
        const optionsToSync: SyncProductOptionsStepInput = [];
        const staleOptionsToRemove: RemoveStaleProductOptionsStepInput = [];

        const defaultCurrencyCode = (
          data.stores[0]?.default_currency_code || "rub"
        ).toLowerCase();

        const propertiesMap = new Map<string, OffersOutput["properties"][0]>();
        data.offersData.properties.forEach((prop) => {
          propertiesMap.set(prop.name, prop);
        });

        const groupedOffers = new Map<string, OffersOutput["offers"]>();
        data.offersData.offers.forEach((offer) => {
          const productId = offer.id!.split("#")[0];
          if (!groupedOffers.has(productId)) {
            groupedOffers.set(productId, []);
          }
          groupedOffers.get(productId)!.push(offer);
        });

        data.existingProducts.forEach((product) => {
          const offersForProduct = groupedOffers.get(product.external_id!);
          if (!offersForProduct) return;

          const existingOptions = (product.options ?? []).map((option: any) => ({
            id: option.id,
            title: option.title,
            values: (option.values ?? []).map((value: any) => ({
              id: value.id,
              value: value.value,
            })),
          }));

          const skuToVariantId = new Map<string, string>();
          (product.variants ?? []).forEach((variant) => {
            if (variant.sku) skuToVariantId.set(variant.sku, variant.id);
          });

          const usedOptionTitles = new Set<string>();
          let draftVariants: CreateProductVariantWorkflowInputDTO[] =
            offersForProduct.map((offer) => {
              const variantOptions: Record<string, string> = {};
              if (offer.characteristics && offer.characteristics.length > 0) {
                offer.characteristics.forEach((char) => {
                  const optionTitle = char.name
                    .replace(/\s*\(.*\)$/, "")
                    .trim();
                  usedOptionTitles.add(optionTitle);
                  variantOptions[optionTitle] = char.value;
                });
              }
              const sku = offer.article || offer.id;
              const existingVariantId = skuToVariantId.get(sku!);
              return {
                ...(existingVariantId ? { id: existingVariantId } : {}),
                title: offer.name,
                sku,
                prices: offer.prices?.map((p) => ({
                  amount: Number(p.pricePerUnit),
                  currency_code: (
                    p.currency || defaultCurrencyCode
                  ).toLowerCase(),
                })),
                options: variantOptions,
                metadata: { isSpecific: offer.id!.includes("#") },
              };
            });

          const hasSpecificVariants = draftVariants.some(
            (v) => v.metadata?.isSpecific
          );
          const finalVariants = hasSpecificVariants
            ? draftVariants.filter((v) => v.metadata?.isSpecific)
            : draftVariants;

          const finalOptions = Array.from(usedOptionTitles).map((title) => {
            const prop = propertiesMap.get(title);
            const values = prop?.dictionaryValues?.map((dv) => dv.value) || [];
            return { title, values };
          });

          if (finalOptions.length > 0) {
            finalVariants.forEach((variant) => {
              delete variant.metadata;
            });

            optionsToSync.push({
              productId: product.id,
              existingOptions,
              optionsNeeded: finalOptions,
            });

            const staleDefaultOption = existingOptions.find(
              (option) => option.title === "Default Option"
            );
            if (staleDefaultOption) {
              staleOptionsToRemove.push({
                productId: product.id,
                optionId: staleDefaultOption.id,
              });
            }
          } else if (finalVariants.length > 0) {
            finalVariants[0].options = {
              "Default Option": "Default Option Value",
            };
            delete finalVariants[0].metadata;
          }

          productsToUpdate.push({
            id: product.id,
            variants: finalVariants as any[],
          });
        });

        return { productsToUpdate, optionsToSync, staleOptionsToRemove };
      }
    );

    syncProductOptionsStep(optionsToSync);
    removeStaleProductOptionsStep(staleOptionsToRemove);

    updateProductsWorkflow.runAsStep({ input: { products: productsToUpdate } });

    return new WorkflowResponse({ ok: true });
  }
);
