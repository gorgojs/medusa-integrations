import { useTranslations } from "next-intl"

import { resolveErrorKey } from "./error-messages"

export const useErrorMessage = () => {
  const t = useTranslations("Errors")
  return (error: unknown) => t(resolveErrorKey(error))
}
