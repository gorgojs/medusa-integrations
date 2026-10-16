import store from "./json/store.json";

export type SeedStore = {
  name: string;
  default_currency_code: string;
  sales_channel: {
    name: string;
    description: string;
  };
  publishable_api_key: {
    title: string;
  };
};

export const SEED_STORE: SeedStore = store;
