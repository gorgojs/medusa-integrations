"use client"

import type React from "react"
import Input from "@modules/common/components/input"
import { useTranslations } from "next-intl"
import type { AddressAutocompleteProps } from "./types"

const ManualAddressFields = ({
  values,
  onChange,
  required,
}: AddressAutocompleteProps) => {
  const t = useTranslations("CheckoutPage")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, [e.target.name]: e.target.value })
  }

  return (
    <>
      <Input
        label={t("fieldAddress")}
        name="address_1"
        autoComplete="address-line1"
        value={values.address_1}
        onChange={handleChange}
        required={required}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t("fieldPostalCode")}
          name="postal_code"
          autoComplete="postal-code"
          value={values.postal_code}
          onChange={handleChange}
          required={required}
        />
        <Input
          label={t("fieldCity")}
          name="city"
          autoComplete="address-level2"
          value={values.city}
          onChange={handleChange}
          required={required}
        />
      </div>
      <Input
        label={t("fieldProvince")}
        name="province"
        autoComplete="address-level1"
        value={values.province}
        onChange={handleChange}
      />
    </>
  )
}

export default ManualAddressFields
