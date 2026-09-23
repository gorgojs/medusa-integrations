import type { MedusaContainer } from "@medusajs/framework";
import { Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  batchLinkProductsToCollectionWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  SEED_CATEGORIES,
  SEED_COLLECTIONS,
  SEED_PRODUCTS,
  SEED_PRODUCT_OPTIONS,
} from "../data/products";
import { getShippingProfile } from "./fulfillment";
import { getProductPrices } from "./regions";
import { getSalesChannel } from "./store";
import { getQuery } from "./utils";

const PRODUCT_STATUSES: Record<string, ProductStatus> = {
  draft: ProductStatus.DRAFT,
  proposed: ProductStatus.PROPOSED,
  published: ProductStatus.PUBLISHED,
  rejected: ProductStatus.REJECTED,
};

const productStatus = (status: string) => {
  const productStatus = PRODUCT_STATUSES[status];
  if (!productStatus) throw new Error(`Unknown product status "${status}".`);
  return productStatus;
};

export const getCategoryIdsByHandle = async (container: MedusaContainer) => {
  const { data } = await getQuery(container).graph({
    entity: "product_category",
    fields: ["id", "handle"],
  });
  return new Map(data.map((category) => [category.handle, category.id]));
};

export const getProductIdsByHandle = async (container: MedusaContainer) => {
  const { data } = await getQuery(container).graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  return new Map(data.map((product) => [product.handle, product.id]));
};

export const getProductOptionIdsByTitle = async (
  container: MedusaContainer,
) => {
  const { data } = await getQuery(container).graph({
    entity: "product_option",
    fields: ["id", "title"],
  });
  return new Map(data.map((option) => [option.title, option.id]));
};

export const seedCategories = async (container: MedusaContainer) => {
  const { result: parentCategories } = await createProductCategoriesWorkflow(
    container,
  ).run({
    input: {
      product_categories: SEED_CATEGORIES.map((category) => ({
        name: category.name,
        handle: category.handle,
        is_active: true,
      })),
    },
  });

  const parentIdByHandle = new Map(
    parentCategories.map((category) => [category.handle, category.id]),
  );

  const childCategories = SEED_CATEGORIES.flatMap((category) =>
    (category.children ?? []).map((child) => ({
      name: child.name,
      handle: child.handle,
      is_active: true,
      parent_category_id: parentIdByHandle.get(category.handle),
    })),
  );

  if (!childCategories.length) return;

  await createProductCategoriesWorkflow(container).run({
    input: { product_categories: childCategories },
  });
};

export const seedProductOptions = async (container: MedusaContainer) => {
  await createProductOptionsWorkflow(container).run({
    input: {
      product_options: SEED_PRODUCT_OPTIONS.map((option) => ({
        title: option.title,
        values: option.values.map((optionValue) => optionValue.value),
        // The store API returns option values alphabetically, so "S, M, L, XL"
        // would reach the storefront as "L, M, S, XL". Ranking them by their
        // position here keeps the order written in the JSON.
        ranks: Object.fromEntries(
          option.values.map((optionValue, index) => [
            optionValue.value,
            index + 1,
          ]),
        ),
      })),
    },
  });
};

export const seedProducts = async (container: MedusaContainer) => {
  const shippingProfile = await getShippingProfile(container);
  const salesChannel = await getSalesChannel(container);
  const categoryIdsByHandle = await getCategoryIdsByHandle(container);
  const optionIdsByTitle = await getProductOptionIdsByTitle(container);

  await createProductsWorkflow(container).run({
    input: {
      products: SEED_PRODUCTS.map((product) => {
        const categoryId = categoryIdsByHandle.get(product.category);
        if (!categoryId) {
          throw new Error(
            `Unknown category "${product.category}" for product "${product.handle}".`,
          );
        }

        return {
          title: product.title,
          handle: product.handle,
          description: product.description,
          status: productStatus(product.status),
          weight: product.weight,
          metadata: product.metadata,
          category_ids: [categoryId],
          shipping_profile_id: shippingProfile.id,
          images: product.images.map((url) => ({ url })),
          options: product.options.map((title) => {
            const optionId = optionIdsByTitle.get(title);
            if (!optionId) {
              throw new Error(
                `Unknown product option "${title}" for product "${product.handle}".`,
              );
            }
            return { id: optionId };
          }),
          variants: product.variants.map((variant) => ({
            title: variant.title,
            sku: variant.sku,
            options: variant.options,
            prices: getProductPrices(product.handle),
          })),
          sales_channels: [{ id: salesChannel.id }],
        };
      }),
    },
  });
};

export const seedProductOptionMetadata = async (container: MedusaContainer) => {
  const productModuleService = container.resolve(Modules.PRODUCT);

  const metadataByValue = new Map(
    SEED_PRODUCT_OPTIONS.flatMap((option) =>
      option.values
        .filter((optionValue) => optionValue.metadata)
        .map((optionValue) => [optionValue.value, optionValue.metadata!]),
    ),
  );

  const optionValues = await productModuleService.listProductOptionValues({});

  await Promise.all(
    optionValues
      .filter((optionValue) => metadataByValue.has(optionValue.value))
      .map((optionValue) =>
        productModuleService.updateProductOptionValues(optionValue.id, {
          metadata: {
            ...(optionValue.metadata ?? {}),
            ...metadataByValue.get(optionValue.value),
          },
        }),
      ),
  );
};

export const seedCollections = async (container: MedusaContainer) => {
  const { result: collections } = await createCollectionsWorkflow(
    container,
  ).run({
    input: {
      collections: SEED_COLLECTIONS.map((collection) => ({
        title: collection.title,
        handle: collection.handle,
      })),
    },
  });

  const productIdsByHandle = await getProductIdsByHandle(container);

  for (const collection of collections) {
    const seedCollection = SEED_COLLECTIONS.find(
      (candidate) => candidate.handle === collection.handle,
    );
    if (!seedCollection) continue;

    await batchLinkProductsToCollectionWorkflow(container).run({
      input: {
        id: collection.id,
        add: seedCollection.products.map((handle) => {
          const productId = productIdsByHandle.get(handle);
          if (!productId) {
            throw new Error(
              `Unknown product "${handle}" in collection "${collection.handle}".`,
            );
          }
          return productId;
        }),
      },
    });
  }
};
