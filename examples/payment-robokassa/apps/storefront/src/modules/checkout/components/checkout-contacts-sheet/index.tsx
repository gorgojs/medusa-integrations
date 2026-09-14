"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { setAddresses, updateCart } from "@lib/data/cart"
import { Button, Checkbox, Text } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import { CheckoutModal } from "@modules/checkout/components/checkout-modal"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useTranslations } from "next-intl"

interface CheckoutContactsSheetProps {
  open: boolean
  onClose: () => void
  cart: HttpTypes.StoreCart
}

export default function CheckoutContactsSheet({
  open,
  onClose,
  cart,
}: CheckoutContactsSheetProps) {
  const t = useTranslations("CheckoutPage")
  const router = useRouter()
  const addr = cart.shipping_address
  const meta = cart.metadata as Record<string, string> | null

  const wasDifferentRecipient = meta?.has_different_recipient === "true"

  const [isDifferentRecipient, setIsDifferentRecipient] = useState(wasDifferentRecipient)
  const [formData, setFormData] = useState({
    first_name: meta?.contact_first_name || "",
    last_name: meta?.contact_last_name || "",
    email: cart.email || "",
    phone: meta?.contact_phone || "",
    recipient_first_name: wasDifferentRecipient ? addr?.first_name || "" : "",
    recipient_last_name: wasDifferentRecipient ? addr?.last_name || "" : "",
    recipient_phone: wasDifferentRecipient ? addr?.phone || "" : "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const contact = isDifferentRecipient
      ? {
        first_name: formData.recipient_first_name,
        last_name: formData.recipient_last_name,
        phone: formData.recipient_phone,
      }
      : {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      }

    const result = await setAddresses({
      shipping_address: contact,
      email: formData.email,
      same_as_billing: true,
    })
    if (result) {
      setError(result)
      setIsSubmitting(false)
      return
    }

    await updateCart({
      metadata: {
        contact_first_name: formData.first_name,
        contact_last_name: formData.last_name,
        contact_phone: formData.phone,
        has_different_recipient: isDifferentRecipient ? "true" : "false",
      },
    } as HttpTypes.StoreUpdateCart)

    setIsSubmitting(false)
    onClose()
    router.refresh()
  }

  return (
    <CheckoutModal open={open} onClose={onClose} title={t("contactsModalTitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("fieldFirstName")}
              name="first_name"
              autoComplete="given-name"
              value={formData.first_name}
              onChange={handleChange}
              required
              data-testid="shipping-first-name-input"
            />
            <Input
              label={t("fieldLastName")}
              name="last_name"
              autoComplete="family-name"
              value={formData.last_name}
              onChange={handleChange}
              required
              data-testid="shipping-last-name-input"
            />
          </div>

          <Input
            label={t("fieldEmail")}
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
            data-testid="shipping-email-input"
          />

          <Input
            label={t("fieldPhone")}
            name="phone"
            autoComplete="tel"
            value={formData.phone}
            onChange={handleChange}
            data-testid="shipping-phone-input"
          />

          <div className="flex items-center gap-x-2">
            <Checkbox
              checked={isDifferentRecipient}
              onCheckedChange={(checked) => setIsDifferentRecipient(checked === true)} />
            <Text
              className="text-ui-fg-subtle"
            >
              {t("recipientCheckbox")}
            </Text>
          </div>

          {isDifferentRecipient && (
            <div className="flex flex-col gap-y-3 pt-1">
              <p className="txt-compact-small-plus text-ui-fg-subtle">
                {t("recipientHeading")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("fieldFirstName")}
                  name="recipient_first_name"
                  autoComplete="given-name"
                  value={formData.recipient_first_name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label={t("fieldLastName")}
                  name="recipient_last_name"
                  autoComplete="family-name"
                  value={formData.recipient_last_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <Input
                label={t("fieldPhone")}
                name="recipient_phone"
                autoComplete="tel"
                value={formData.recipient_phone}
                onChange={handleChange}
              />
            </div>
          )}
        </div>

        <ErrorMessage error={error} />

        <div className="flex gap-x-2 mt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            size="large"
            className="w-full"
          >
            {t("close")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="large"
            className="w-full"
          >
            {isSubmitting ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </CheckoutModal>
  )
}
