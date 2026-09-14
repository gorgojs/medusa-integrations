import categories from "./json/categories.json";
import collections from "./json/collections.json";
import productOptions from "./json/product-options.json";
import products from "./json/products.json";

export type SeedCategory = {
  handle: string;
  name: string;
  children?: SeedCategory[];
};

export type SeedProductOptionValue = {
  value: string;
  metadata?: Record<string, unknown>;
};

export type SeedProductOption = {
  title: string;
  values: SeedProductOptionValue[];
};

export type SeedProductVariant = {
  title: string;
  sku: string;
  options: Record<string, string>;
};

export type SeedProduct = {
  handle: string;
  title: string;
  description: string;
  status: string;
  category: string;
  weight: number;
  metadata?: Record<string, unknown>;
  images: string[];
  options: string[];
  variants: SeedProductVariant[];
};

export type SeedCollection = {
  handle: string;
  title: string;
  products: string[];
};

export const SEED_CATEGORIES: SeedCategory[] = categories;
export const SEED_PRODUCT_OPTIONS: SeedProductOption[] = productOptions;
export const SEED_PRODUCTS: SeedProduct[] = products;
export const SEED_COLLECTIONS: SeedCollection[] = collections;
