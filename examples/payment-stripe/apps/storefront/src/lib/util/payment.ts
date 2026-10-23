import { paymentInfoMap } from "@lib/constants"

/**
 * The `PaymentMethods` translator, in either its client or its server form.
 */
type PaymentMethodTranslator = ((key: string) => string) & {
  has: (key: string) => boolean
}

/**
 * How a payment method reads in the checkout. `title` names the method, and
 * `subtitle` carries the line under it — the acquirer behind the method, the
 * schemes it accepts, or the card an order was paid with.
 */
export type PaymentMethodLabel = {
  title: string
  subtitle?: string
}

/**
 * Labels a payment provider in the reader's language.
 *
 * Every store configures its own providers, so the catalog can only carry the
 * ones this starter ships with. Anything else falls back to the English entry
 * in `paymentInfoMap` and then to the provider id, which is still better than
 * showing a customer a missing translation key. A method without a subtitle in
 * either place renders as a title alone.
 */
export function paymentMethodLabel(
  t: PaymentMethodTranslator,
  providerId?: string | null
): PaymentMethodLabel {
  if (!providerId) {
    return { title: "" }
  }

  const fallback = paymentInfoMap[providerId]

  return {
    title: t.has(`${providerId}.title`)
      ? t(`${providerId}.title`)
      : fallback?.title ?? providerId,
    subtitle: t.has(`${providerId}.subtitle`)
      ? t(`${providerId}.subtitle`)
      : fallback?.subtitle,
  }
}

/**
 * The name on its own, for the places that show a payment method as one line.
 */
export function paymentMethodName(
  t: PaymentMethodTranslator,
  providerId?: string | null
): string {
  return paymentMethodLabel(t, providerId).title
}
