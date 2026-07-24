import { InitOptions } from "i18next"
import translations from "./translations"

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  detection: {
    caches: ["cookie", "localStorage", "header"],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage", "header"],
  },
  resources: translations,
  supportedLngs: Object.keys(translations),
}