import { paymentInfoMap } from "@lib/constants"

/**
 * The `PaymentMethods` translator, in either its client or its server form.
 */
type PaymentMethodTranslator = ((key: string) => string) & {
  has: (key: string) => boolean
}

/**
 * Names a payment provider in the reader's language.
 *
 * Every store configures its own providers, so the catalog can only carry the
 * ones this starter ships with. Anything else falls back to the English title
 * in `paymentInfoMap` and then to the provider id, which is still better than
 * showing a customer a missing translation key.
 */
export function paymentMethodName(
  t: PaymentMethodTranslator,
  providerId?: string | null
): string {
  if (!providerId) {
    return ""
  }

  if (t.has(providerId)) {
    return t(providerId)
  }

  return paymentInfoMap[providerId]?.title ?? providerId
}
