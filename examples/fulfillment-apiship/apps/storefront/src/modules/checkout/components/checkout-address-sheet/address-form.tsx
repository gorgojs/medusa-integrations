"use client"

import { useState, type FormEvent } from "react"
import { usePathname } from "next/navigation"
import { setAddresses, updateRegion } from "@lib/data/cart"
import type { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useTranslations } from "next-intl"
import AddressAutocomplete, {
  type AddressFields,
} from "@modules/common/components/address-autocomplete"
import { Button, RadioGroup } from "@medusajs/ui"
import { useLocaleDirection } from "@lib/hooks/use-locale-direction"

type CheckoutAddressFormProps = {
  cart: HttpTypes.StoreCart
  addresses: HttpTypes.StoreCustomerAddress[] | null
  onClose: () => void
  /** Runs once the address is on the cart, unless picking it moved the cart to another region. */
  onSaved: () => void
  submitLabel?: string
}

/**
 * The address step of the checkout, a saved address to pick or a new one to enter. The
 * address sheet shows it on its own, and a shipping provider that needs an address before
 * it can offer anything shows it as the first step of its own sheet.
 */
export default function CheckoutAddressForm({
  cart,
  addresses,
  onClose,
  onSaved,
  submitLabel,
}: CheckoutAddressFormProps) {
  const t = useTranslations("CheckoutPage")
  const dir = useLocaleDirection()
  const pathname = usePathname()
  const shippingAddress = cart.shipping_address

  const savedAddresses = addresses ?? []
  const hasSaved = savedAddresses.length > 0

  const matchingAddress = savedAddresses.find(
    (address) =>
      address.address_1 === shippingAddress?.address_1 &&
      address.postal_code === shippingAddress?.postal_code &&
      address.city === shippingAddress?.city
  )
  const manualAddress =
    !matchingAddress && shippingAddress?.address_1
      ? shippingAddress
      : undefined
  const initialMode = manualAddress || !hasSaved ? "new" : "select"

  const [mode, setMode] = useState(initialMode)
  const [selectedId, setSelectedId] = useState(matchingAddress?.id)
  const [company, setCompany] = useState(manualAddress?.company ?? "")
  const [addressFields, setAddressFields] = useState<AddressFields>({
    address_1: manualAddress?.address_1 ?? "",
    postal_code: manualAddress?.postal_code ?? "",
    city: manualAddress?.city ?? "",
    province: manualAddress?.province ?? "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const countryName = (code?: string | null) =>
    cart.region?.countries?.find((c) => c.iso_2 === code?.toLowerCase())
      ?.display_name ||
    code?.toUpperCase() ||
    ""

  const formatAddress = (address: HttpTypes.StoreCustomerAddress) =>
    [
      address.postal_code,
      countryName(address.country_code),
      address.city,
      address.address_1,
    ]
      .filter(Boolean)
      .join(", ")

  async function applySaved(address: HttpTypes.StoreCustomerAddress) {
    setApplyingId(address.id)
    setError(null)
    const result = await setAddresses({
      shipping_address: {
        company: address.company ?? undefined,
        address_1: address.address_1 ?? undefined,
        postal_code: address.postal_code ?? undefined,
        city: address.city ?? undefined,
        province: address.province ?? undefined,
        country_code: address.country_code ?? undefined,
      },
    })
    if (result) {
      setError(result)
      setApplyingId(null)
      return
    }
    setApplyingId(null)
    if (
      address.country_code &&
      address.country_code !== shippingAddress?.country_code
    ) {
      onClose()
      await updateRegion(address.country_code, pathname)
    } else {
      onSaved()
    }
  }

  function handleSelect(value: string) {
    setSelectedId(value)
    const address = savedAddresses.find((address) => address.id === value)
    if (address) applySaved(address)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await setAddresses({
        shipping_address: { ...addressFields, company },
      })
      if (result) {
        setError(result)
        return
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  return mode === "select" && hasSaved ? (
    <div className="flex flex-col">
      <RadioGroup
        dir={dir}
        value={selectedId}
        onValueChange={handleSelect}
        disabled={!!applyingId}
        className="flex flex-col gap-[10px]"
      >
        {savedAddresses.map((address) => (
          <RadioGroup.ChoiceBox
            key={address.id}
            value={address.id}
            label={
              address.address_name || address.company || t("fieldAddress")
            }
            description={formatAddress(address)}
          />
        ))}
      </RadioGroup>

      <ErrorMessage error={error} />

      <Button
        type="button"
        onClick={() => setMode("new")}
        size="large"
        className="w-full mt-4"
      >
        {t("addNewAddress")}
      </Button>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex flex-col gap-y-3">
        <AddressAutocomplete
          values={addressFields}
          onChange={setAddressFields}
          required
        />
        <Input
          label={t("fieldCompany")}
          name="company"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          data-testid="shipping-company-input"
        />
      </div>
      <ErrorMessage error={error} />
      <div className="flex gap-x-2 mt-4">
        <Button
          type="button"
          onClick={() => (hasSaved ? setMode("select") : onClose())}
          variant="secondary"
          size="large"
          className="w-full"
        >
          {hasSaved ? t("back") : t("close")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          size="large"
          className="w-full"
        >
          {isSubmitting ? t("saving") : (submitLabel ?? t("save"))}
        </Button>
      </div>
    </form>
  )
}
