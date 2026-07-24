import {
  IProductModuleService,
  ProductCategoryDTO,
  UpdateProductCategoryDTO,
} from "@medusajs/framework/types";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import { ClassifierGroup } from "commerceml-parser-core";
import slugify from "sluga";

export const processCategoriesRecursivelyStep = createStep(
  "process-categories-recursively-step",
  async (
    {
      classifierGroups,
      existingCategories,
    }: {
      classifierGroups: ClassifierGroup[];
      existingCategories: ProductCategoryDTO[];
    },
    { container }
  ) => {
    const productModuleService = container.resolve(
      Modules.PRODUCT
    ) as IProductModuleService;
    const allProcessedCategories: ProductCategoryDTO[] = [];
    const claimedHandles = new Set<string>(
      existingCategories.map((c) => c.handle)
    );

    const processGroups = async (
      groups: ClassifierGroup[],
      parentCategoryId: string | null = null
    ) => {
      if (!groups?.length) return;

      for (const group of groups) {
        const existingCategory = existingCategories.find(
          (c) => c.metadata?.onec_id === group.id
        );
        const baseHandle = slugify(group.name);
        let handle = baseHandle;
        let counter = 1;

        while (
          claimedHandles.has(handle) &&
          (!existingCategory || existingCategory.handle !== handle)
        ) {
          handle = `${baseHandle}-${counter++}`;
        }

        const categoryData = {
          name: group.name,
          handle,
          metadata: { onec_id: group.id },
          parent_category_id: parentCategoryId,
        };

        let savedCategory: ProductCategoryDTO | undefined;

        if (existingCategory) {
          if (existingCategory.handle !== handle) {
            claimedHandles.delete(existingCategory.handle);
          }
          savedCategory = await productModuleService.updateProductCategories(
            existingCategory.id,
            categoryData as UpdateProductCategoryDTO
          );
        } else {
          const [createdCategory] =
            await productModuleService.createProductCategories([categoryData]);
          savedCategory = createdCategory;
        }

        if (savedCategory) {
          claimedHandles.add(savedCategory.handle);
          allProcessedCategories.push(savedCategory);
          if (group.groups) {
            await processGroups(group.groups, savedCategory.id);
          }
        }
      }
    };

    await processGroups(classifierGroups);
    return new StepResponse(allProcessedCategories);
  }
);
