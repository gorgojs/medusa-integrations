import path from "node:path";
import { readJsonDir } from "../read-json-dir";

export type SeedStockLocation = {
  name: string;
  address: {
    address_1: string;
    country_code: string;
  };
};

export type SeedRegion = {
  name: string;
  currency_code: string;
  countries: string[];
  stock_location: SeedStockLocation;
  shipping_prices: Record<string, number>;
  product_prices: Record<string, number>;
};

export const SEED_REGIONS: SeedRegion[] = readJsonDir<SeedRegion>(
  path.join(__dirname, "json"),
  {
    label: "region files",
    requiredFields: [
      "name",
      "currency_code",
      "countries.0",
      "stock_location.name",
      "stock_location.address.address_1",
      "stock_location.address.country_code",
      "shipping_prices",
      "product_prices",
    ],
  },
).map((entry) => entry.data);
