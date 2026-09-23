import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"

import NativeSelect, {
  type NativeSelectProps,
} from "@modules/common/components/native-select"
import type { HttpTypes } from "@medusajs/types"
import { useLocale, useTranslations } from "next-intl"

const getLocalizedCountryName = (isoCode: string, locale: string, fallback: string): string => {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(isoCode.toUpperCase()) ?? fallback
  } catch {
    return fallback
  }
}

const CountrySelect = forwardRef<
  HTMLSelectElement,
  NativeSelectProps & {
    region?: HttpTypes.StoreRegion
  }
>(({ placeholder, region, defaultValue, ...props }, ref) => {
  const innerRef = useRef<HTMLSelectElement>(null)
  const locale = useLocale()
  const t = useTranslations("AddressForm")

  useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
    ref,
    () => innerRef.current
  )

  const countryOptions = useMemo(() => {
    if (!region) {
      return []
    }

    return region.countries?.map((country) => ({
      value: country.iso_2,
      label: getLocalizedCountryName(country.iso_2 ?? "", locale, country.display_name ?? ""),
    }))
  }, [region, locale])

  return (
    <NativeSelect
      ref={innerRef}
      placeholder={placeholder ?? t("country")}
      defaultValue={defaultValue}
      {...props}
    >
      {countryOptions?.map(({ value, label }, index) => (
        <option key={index} value={value}>
          {label}
        </option>
      ))}
    </NativeSelect>
  )
})

CountrySelect.displayName = "CountrySelect"

export default CountrySelect
