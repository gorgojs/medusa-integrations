"use client"

import { useId, useState } from "react"
import { Checkbox, Text } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import { addressAutocompleteProvider, isDaData } from "@lib/constants"
import DaDataAddressInput from "./providers/dadata"
import PlainAddressInput from "./providers/plain"
import ManualAddressFields from "./manual-address-fields"
import type { AddressAutocompleteProps } from "./types"

export type { AddressFields } from "./types"

const AddressAutocomplete = (props: AddressAutocompleteProps) => {
  const t = useTranslations("CheckoutPage")
  const uid = useId()
  const [manual, setManual] = useState(false)

  const renderAutocomplete = () => {
    switch (true) {
      case isDaData(addressAutocompleteProvider):
        return <DaDataAddressInput {...props} />
      default:
        return <PlainAddressInput {...props} />
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center gap-x-2">
        <Checkbox
          id={uid}
          checked={manual}
          onCheckedChange={(value) => setManual(value === true)}
        />
        <Text
          className="text-ui-fg-subtle"
        >
          {t("manualInput")}
        </Text>
      </div>

      {manual ? <ManualAddressFields {...props} /> : renderAutocomplete()}
    </div>
  )
}

export default AddressAutocomplete
