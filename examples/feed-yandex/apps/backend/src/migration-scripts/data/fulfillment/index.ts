import shippingOptions from "./json/shipping-options.json";

export type SeedShippingOption = {
  code: string;
  name: string;
  label: string;
  description: string;
  provider_id: string;
  metadata?: Record<string, unknown>;
};

export const SEED_SHIPPING_OPTIONS: SeedShippingOption[] = shippingOptions;

export const SEED_FULFILLMENT_PROVIDER_IDS = Array.from(
  new Set(SEED_SHIPPING_OPTIONS.map((option) => option.provider_id)),
);
