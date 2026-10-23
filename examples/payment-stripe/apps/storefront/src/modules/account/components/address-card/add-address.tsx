"use client"

import { Plus } from "@medusajs/icons"
import { Button } from "@medusajs/ui"
import { useActionState, useEffect, useState } from "react"

import { addCustomerAddress } from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import type { HttpTypes } from "@medusajs/types"
import { CheckoutModal } from "@modules/checkout/components/checkout-modal"
import CountrySelect from "@modules/checkout/components/country-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useTranslations } from "next-intl"

const AddAddress = ({ region }: { region: HttpTypes.StoreRegion }) => {
  const t = useTranslations("AddressCard")
  const tf = useTranslations("AddressForm")
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  return (
    <>
      <button
        type="button"
        className="flex min-h-[220px] h-full w-full flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-ui-border-strong p-5 text-ui-fg-subtle transition-colors hover:border-ui-border-interactive hover:text-ui-fg-base"
        onClick={open}
        data-testid="add-address-button"
      >
        <Plus />
        <span className="text-base-semi">{t("newAddress")}</span>
      </button>

      <CheckoutModal open={state} onClose={close} title={t("addAddress")}>
        <form action={formAction} className="flex flex-col" data-testid="add-address-modal">
          <div className="flex flex-col gap-y-3">
            <Input
              label={tf("addressName")}
              name="address_name"
              required
              autoComplete="address_name"
              data-testid="addres-name-input"
            />
            <Input
              label={tf("company")}
              name="company"
              autoComplete="organization"
              data-testid="company-input"
            />
            <Input
              label={tf("address")}
              name="address_1"
              required
              autoComplete="address-line1"
              data-testid="address-1-input"
            />
            <Input
              label={tf("addressLine2")}
              name="address_2"
              autoComplete="address-line2"
              data-testid="address-2-input"
            />
            <div className="grid grid-cols-[144px_1fr] gap-x-2">
              <Input
                label={tf("postalCode")}
                name="postal_code"
                required
                autoComplete="postal-code"
                data-testid="postal-code-input"
              />
              <Input
                label={tf("city")}
                name="city"
                required
                autoComplete="locality"
                data-testid="city-input"
              />
            </div>
            <Input
              label={tf("province")}
              name="province"
              autoComplete="address-level1"
              data-testid="state-input"
            />
            <CountrySelect
              region={region}
              name="country_code"
              required
              autoComplete="country"
              data-testid="country-select"
              className="h-10"
            />
            <Input
              label={tf("phone")}
              name="phone"
              autoComplete="phone"
              data-testid="phone-input"
            />
          </div>

          <ErrorMessage error={formState.error} data-testid="address-error" />

          <div className="flex gap-x-2 mt-4">
            <Button
              type="button"
              onClick={close}
              variant="secondary"
              size="large"
              className="w-full"
              data-testid="cancel-button"
            >
              {tf("cancel")}
            </Button>
            <SubmitButton className="w-full" data-testid="save-button">
              {tf("save")}
            </SubmitButton>
          </div>
        </form>
      </CheckoutModal>
    </>
  )
}

export default AddAddress
