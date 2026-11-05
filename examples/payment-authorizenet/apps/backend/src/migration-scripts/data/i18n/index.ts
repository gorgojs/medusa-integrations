import path from "node:path";
import { readJsonDir } from "../read-json-dir";

export type ProductText = { title: string; description: string };
export type LabelText = { label: string; description: string };

export type SeedTranslations = {
  terms: Record<string, string>;
  categories: Record<string, string>;
  products: Record<string, ProductText>;
  collections: Record<string, string>;
  shippingOptions: Record<string, string>;
  shippingTypes: Record<string, LabelText>;
  refundReasons: Record<string, LabelText>;
};

export type SeedLocale = string;

export type SeedLocaleFile = {
  name: string;
  translations: SeedTranslations;
};

const locales = readJsonDir<SeedLocaleFile>(path.join(__dirname, "json"), {
  label: "locale files",
  requiredFields: [
    "name",
    "translations.terms",
    "translations.categories",
    "translations.products",
    "translations.collections",
    "translations.shippingOptions",
    "translations.shippingTypes",
    "translations.refundReasons",
  ],
}).map((entry) => ({ code: entry.name, ...entry.data }));

export const SEED_LOCALES: SeedLocale[] = locales.map((locale) => locale.code);

export const SEED_LOCALE_NAMES: Record<SeedLocale, string> = Object.fromEntries(
  locales.map((locale) => [locale.code, locale.name]),
);

export const SEED_TRANSLATIONS: Record<SeedLocale, SeedTranslations> =
  Object.fromEntries(
    locales.map((locale) => [locale.code, locale.translations]),
  );
