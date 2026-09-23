"use client"

import type React from "react"
import { useState, useId } from "react"
import type { DaDataSuggestion, DaDataAddress } from "react-dadata"
import { AddressSuggestions } from "react-dadata"
import "react-dadata/dist/react-dadata.css"
import { useTranslations } from "next-intl"
import type { AddressAutocompleteProps } from "../types"

function buildAddressLine(d: DaDataAddress): string {
  return [
    d.street_with_type,
    d.house ? `д. ${d.house}` : null,
    d.block ? `${d.block_type || "корп."} ${d.block}` : null,
    d.flat ? `кв. ${d.flat}` : null,
  ]
    .filter(Boolean)
    .join(", ")
}

const DaDataAddressInput = ({
  values,
  onChange,
  required,
}: AddressAutocompleteProps) => {
  const t = useTranslations("CheckoutPage")
  const [suggestion, setSuggestion] = useState<
    DaDataSuggestion<DaDataAddress> | undefined
  >()
  const uid = useId()

  const token = process.env.NEXT_PUBLIC_ADDRESS_AUTOCOMPLETE_PROVIDER_API_KEY || ""

  const handleSuggestionChange = (
    s: DaDataSuggestion<DaDataAddress> | undefined
  ) => {
    if (!s) return
    setSuggestion(s)
    const d = s.data
    onChange({
      address_1: buildAddressLine(d) || s.value,
      postal_code: d.postal_code || "",
      city: d.city || d.settlement || d.area || "",
      province: d.region_with_type || d.region || "",
    })
  }

  const handleInputTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, address_1: e.target.value })
  }

  return (
    <>
      <div className="flex flex-col w-full gap-y-1">
        <span className="txt-compact-small text-ui-fg-subtle px-1">
          {t("fieldAddress")}
          {required && <span className="text-rose-500">*</span>}
        </span>
        <AddressSuggestions
          token={token}
          value={suggestion}
          defaultQuery={values.address_1}
          onChange={handleSuggestionChange}
          uid={uid}
          delay={300}
          inputProps={{
            className:
              "block w-full h-11 px-4 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 border-ui-border-base hover:bg-ui-bg-field-hover txt-compact-medium",
            autoComplete: "off",
            onChange: handleInputTyping,
            required,
          }}
          containerClassName="react-dadata-container relative w-full"
        />
      </div>

      {(values.postal_code || values.city || values.province) && (
        <div className="flex flex-col gap-y-1 px-1 text-ui-fg-subtle txt-compact-xsmall">
          {(values.postal_code || values.city) && (
            <div className="flex gap-x-4">
              {values.postal_code && (
                <span>
                  <span className="text-ui-fg-muted">
                    {t("fieldPostalCode")}:{" "}
                  </span>
                  {values.postal_code}
                </span>
              )}
              {values.city && (
                <span>
                  <span className="text-ui-fg-muted">{t("fieldCity")}: </span>
                  {values.city}
                </span>
              )}
            </div>
          )}
          {values.province && (
            <span>
              <span className="text-ui-fg-muted">{t("fieldProvince")}: </span>
              {values.province}
            </span>
          )}
        </div>
      )}
    </>
  )
}

export default DaDataAddressInput
