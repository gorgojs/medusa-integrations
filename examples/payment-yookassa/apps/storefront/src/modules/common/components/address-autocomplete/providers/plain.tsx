"use client"

import type React from "react"
import Input from "@modules/common/components/input"
import { useTranslations } from "next-intl"
import type { AddressAutocompleteProps } from "../types"

const PlainAddressInput = ({
  values,
  onChange,
  required,
}: AddressAutocompleteProps) => {
  const t = useTranslations("CheckoutPage")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, address_1: e.target.value })
  }

  return (
    <Input
      label={t("fieldAddress")}
      name="address_1"
      autoComplete="address-line1"
      value={values.address_1}
      onChange={handleChange}
      required={required}
    />
  )
}

export default PlainAddressInput
