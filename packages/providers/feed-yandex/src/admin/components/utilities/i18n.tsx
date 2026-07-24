import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import { defaultI18nOptions } from "../../i18n/config"

const i18nInstance = i18n.createInstance()

// TODO: consider implementation like Medusa's i18n with a provider
if (!i18n.isInitialized) {
  i18nInstance
    .use(
      new LanguageDetector(null, {
        lookupCookie: "lng",
        lookupLocalStorage: "lng",
      })
    )
    .use(initReactI18next)
    .init(defaultI18nOptions)
}

export const I18n = () => null

export { i18nInstance as i18n }
