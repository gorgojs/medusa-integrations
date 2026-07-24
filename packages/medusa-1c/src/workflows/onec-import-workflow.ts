import {
  createProductsWorkflow,
  updateProductsWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  CreateProductWorkflowInputDTO,
  ProductCategoryDTO,
  UpdateProductWorkflowInputDTO,
} from "@medusajs/framework/types";
import { ProductDTO } from "@medusajs/types";
import slugify from "sluga";
import { flattenClassifierGroups } from "../utils/product-utils";
import { ImportOutput, OnecExchangeWorkflowInput } from "../types";
import { processCategoriesRecursivelyStep } from "./steps/process-categories";
import { parseImportFilesStep } from "./steps/parse-import-files";

export const onecImportWorkflow = createWorkflow(
  "onec-import-workflow",
  (input: Pick<OnecExchangeWorkflowInput, "import">) => {
    const importData = parseImportFilesStep(input.import);

    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["default_sales_channel_id"],
    }).config({ name: "stores" });

    const externalIdsFilters = transform({ onecData: importData }, (data) =>
      data.onecData.products.map((product) => `${product.id}`)
    );

    const { data: existingProducts } = useQueryGraphStep({
      entity: "product",
      fields: ["id", "external_id"],
      filters: { external_id: externalIdsFilters },
    }).config({ name: "existing-products" });

    const externalCatgoriesIdsFilters = transform(
      { onecData: importData },
      (data) =>
        flattenClassifierGroups(data.onecData.classifierGroups).map(
          (cg) => cg.id
        )
    );

    const categoryHandlesFilters = transform(
      { onecData: importData },
      (data) => [
        ...new Set(
          flattenClassifierGroups(data.onecData.classifierGroups).map((cg) =>
            slugify(cg.name)
          )
        ),
      ]
    );
    const { data: existingCategories } = useQueryGraphStep({
      entity: "product_category",
      fields: ["id", "handle", "metadata"],
      filters: {
        $or: [
          { metadata: { onec_id: externalCatgoriesIdsFilters } },
          { handle: categoryHandlesFilters },
        ],
      },
    }).config({ name: "existing-categories" });

    const processedCategories = processCategoriesRecursivelyStep({
      classifierGroups: importData.classifierGroups,
      existingCategories,
    });

    const { productsToCreate, productsToUpdate } = transform(
      {
        processedCategories,
        existingProducts,
        stores,
        importData,
      },
      (data: {
        processedCategories: ProductCategoryDTO[];
        existingProducts: ProductDTO[];
        stores: {
          default_sales_channel_id: string;
        }[];
        importData: ImportOutput;
      }) => {
        const productsToCreate: CreateProductWorkflowInputDTO[] = [];
        const productsToUpdate: UpdateProductWorkflowInputDTO[] = [];

        const defaultSalesChannelId =
          data.stores[0]?.default_sales_channel_id || "";

        data.importData.products.forEach((onecProduct) => {
          const category_ids = data.processedCategories
            .filter((cat) => cat.metadata?.onec_id === onecProduct.groupId)
            .map((cat) => cat.id);

          const productPayload: Omit<
            CreateProductWorkflowInputDTO,
            "variants" | "options"
          > = {
            title: onecProduct.name,
            category_ids,
            description: onecProduct.description,
            handle: slugify(onecProduct.name),
            external_id: onecProduct.id,
            sales_channels: [{ id: defaultSalesChannelId }],
          };

          const existingProduct = data.existingProducts.find(
            (p) => p.external_id === productPayload.external_id
          );

          if (existingProduct) {
            productsToUpdate.push({
              ...productPayload,
              id: existingProduct.id,
            } as UpdateProductWorkflowInputDTO);
          } else {
            productsToCreate.push({
              ...productPayload,
              options: [
                { title: "Default Option", values: ["Default Option Value"] },
              ],
            } as CreateProductWorkflowInputDTO);
          }
        });

        return { productsToCreate, productsToUpdate };
      }
    );

    createProductsWorkflow.runAsStep({ input: { products: productsToCreate } });
    updateProductsWorkflow.runAsStep({ input: { products: productsToUpdate } });

    return new WorkflowResponse({ ok: true });
  }
);
