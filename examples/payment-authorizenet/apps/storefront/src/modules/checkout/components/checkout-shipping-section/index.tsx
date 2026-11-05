"use client"

import { useState, useEffect, useRef, useTransition, useMemo } from "react"
import { setShippingMethod, updateCart, updateRegion } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import {
  compareShippingOptions,
  findShippingOptionDescriptor,
} from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import {
  getDeliveryDays,
  isPickupShippingOption,
  type DeliveryDays,
} from "@lib/util/fulfillment"
import { useCartUpdate } from "@modules/checkout/context/cart-update-context"
import { Loader, CursorDefault } from "@medusajs/icons"
import { DropdownMenu, RadioGroup, clx } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useErrorMessage } from "@lib/util/use-error-message"
import { useLocaleDirection } from "@lib/hooks/use-locale-direction"
import ShippingOptionCard from "@modules/checkout/components/shipping-option"
import {
  useSelectedShippingOptionId,
  useShippingSelection,
} from "@modules/checkout/context/shipping-selection-context"

type CountryOption = {
  country: string
  region: string
  label: string
}

interface CheckoutShippingSectionProps {
  cart: HttpTypes.StoreCart
  availableShippingOptions:
  | HttpTypes.StoreCartShippingOptionWithServiceZone[]
  | null
  regions: HttpTypes.StoreRegion[]
  currentCountry: string
}

function getLocalizedCountryName(
  isoCode: string,
  locale: string,
  fallback: string
) {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(
        isoCode.toUpperCase()
      ) ?? fallback
    )
  } catch {
    return fallback
  }
}

export default function CheckoutShippingSection({
  cart,
  availableShippingOptions,
  regions,
  currentCountry,
}: CheckoutShippingSectionProps) {
  const t = useTranslations("CheckoutPage")
  const dir = useLocaleDirection()
  const getErrorMessage = useErrorMessage()
  const locale = useLocale()
  const currentPath = usePathname()
  const [isPending, startTransition] = useTransition()
  const { trackCartUpdate } = useCartUpdate()

  const [isLoadingPrices, setIsLoadingPrices] = useState(true)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [shippingError, setShippingError] = useState<string | null>(null)
  const { setPendingOptionId, getOptionData, clearOptionData } =
    useShippingSelection()
  const shippingMethodId = useSelectedShippingOptionId(cart)

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
  }, [])

  const getDeliveryDate = (daysFromNow: number) => {
    const date = new Date(now!)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + daysFromNow)
    return date
  }

  const deliveryDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
      }),
    [locale]
  )

  const formatDeliveryDate = (daysFromNow: number) => {
    return deliveryDateFormatter.format(getDeliveryDate(daysFromNow))
  }

  const formatDeliveryRange = (minDaysFromNow: number, maxDaysFromNow: number) => {
    const startDate = getDeliveryDate(minDaysFromNow)
    const endDate = getDeliveryDate(maxDaysFromNow)

    if (typeof deliveryDateFormatter.formatRange === "function") {
      return deliveryDateFormatter.formatRange(startDate, endDate)
    }

    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
    }).format(startDate) + ` – ${formatDeliveryDate(maxDaysFromNow)}`
  }

  const formatDeliveryDays = (days: DeliveryDays | null) =>
    !days
      ? null
      : days.max === 0
        ? t("deliveryToday")
        : !now
          ? null
          : days.min !== undefined && days.max !== undefined
            ? days.min === days.max
              ? formatDeliveryDate(days.min)
              : formatDeliveryRange(days.min, days.max)
            : days.max !== undefined
              ? t("deliveryDateUntil", {
                date: formatDeliveryDate(days.max),
              })
              : days.min !== undefined
                ? t("deliveryDateFrom", {
                  date: formatDeliveryDate(days.min),
                })
                : null

  const countryOptions = useMemo<CountryOption[]>(() => {
    return regions
      .flatMap((r) =>
        (r.countries ?? []).map((c) => ({
          country: c.iso_2 ?? "",
          region: r.id,
          label: getLocalizedCountryName(
            c.iso_2 ?? "",
            locale,
            c.display_name ?? ""
          ),
        }))
      )
      .filter((o) => o.country)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [regions, locale])

  const selectedCountryOption =
    countryOptions.find((o) => o.country === currentCountry) ??
    countryOptions[0]

  const handleRegionChange = (countryCode: string) => {
    const option = countryOptions.find((opt) => opt.country === countryCode)
    if (!option) {
      return
    }

    startTransition(() => {
      updateRegion(option.country, currentPath)
    })
  }

  const shippingOptions = useMemo(
    () =>
      availableShippingOptions
        ? [...availableShippingOptions].sort(compareShippingOptions)
        : null,
    [availableShippingOptions]
  )

  const quotedUpFront = (option: HttpTypes.StoreCartShippingOption) =>
    option.price_type === "calculated" &&
    !findShippingOptionDescriptor(option)?.pricedByChoice

  const calculatedPriceKey = JSON.stringify({
    options:
      shippingOptions?.filter(quotedUpFront).map((option) => option.id) ?? [],
    cart: cart.id,
    updatedAt: cart.updated_at,
  })

  useEffect(() => {
    setIsLoadingPrices(true)
    if (!shippingOptions?.length) {
      setIsLoadingPrices(false)
      return
    }

    const calculatedMethods = shippingOptions.filter(quotedUpFront)

    if (!calculatedMethods.length) {
      setIsLoadingPrices(false)
      return
    }

    Promise.allSettled(
      calculatedMethods.map((sm) =>
        calculatePriceForShippingOption(sm.id, cart.id)
      )
    ).then((results) => {
      const pricesMap: Record<string, number> = {}
      results.forEach((r) => {
        if (
          r.status === "fulfilled" &&
          r.value?.id &&
          typeof r.value.amount === "number"
        ) {
          pricesMap[r.value.id] = r.value.amount
        }
      })
      setCalculatedPricesMap(pricesMap)
      setIsLoadingPrices(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedPriceKey])

  const optionOrderKey = (shippingOptions ?? []).map((o) => o.id).join(",")
  const autoSelectedForCart = useRef<string | null>(null)

  useEffect(() => {
    if (shippingMethodId || !shippingOptions?.length) return
    if (autoSelectedForCart.current === cart.id) return
    autoSelectedForCart.current = cart.id

    let cancelled = false

    void (async () => {
      for (const option of shippingOptions) {
        if (cancelled) return

        if (findShippingOptionDescriptor(option)?.pricedByChoice) {
          setPendingOptionId(option.id)
          return
        }

        const err = await setShippingMethod({
          cartId: cart.id,
          shippingMethodId: option.id,
        })
          .then(() => null)
          .catch((e: Error) => e.message)

        if (cancelled) return
        if (!err) {
          setPendingOptionId(option.id)
          return
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionOrderKey, cart.id, shippingMethodId])

  const addressKey = [
    cart.shipping_address?.country_code,
    cart.shipping_address?.province,
    cart.shipping_address?.city,
    cart.shipping_address?.postal_code,
    cart.shipping_address?.address_1,
    cart.shipping_address?.address_2,
  ].join("|")
  const currentMethod = cart.shipping_methods?.at(-1)
  const currentMethodId = currentMethod?.id ?? null
  const currentDescriptor = findShippingOptionDescriptor(
    shippingOptions?.find(
      (option) => option.id === currentMethod?.shipping_option_id
    )
  )
  const removeStaleMethod = currentDescriptor?.pricedByChoice
    ? currentDescriptor.removeShippingMethod
    : undefined
  const previousAddressKey = useRef(addressKey)

  useEffect(() => {
    if (previousAddressKey.current === addressKey) return
    previousAddressKey.current = addressKey

    clearOptionData()

    if (!currentMethodId || !removeStaleMethod) return

    trackCartUpdate(() => removeStaleMethod(currentMethodId)).catch(
      (e: Error) => setShippingError(e.message)
    )
  }, [
    addressKey,
    currentMethodId,
    removeStaleMethod,
    clearOptionData,
    trackCartUpdate,
  ])

  const handleSelectShipping = async (id: string) => {
    setShippingError(null)
    const prev = shippingMethodId
    setPendingOptionId(id)

    const selectedOption = shippingOptions?.find((option) => option.id === id)
    const descriptor = findShippingOptionDescriptor(selectedOption)
    const pricedByChoice = Boolean(descriptor?.pricedByChoice)
    const data = getOptionData(id)

    const clearCartMethod = async () => {
      const currentMethodOnCart = cart.shipping_methods?.at(-1)
      if (!currentMethodOnCart || !descriptor?.removeShippingMethod) return

      const remove = descriptor.removeShippingMethod
      await trackCartUpdate(() => remove(currentMethodOnCart.id)).catch(
        (e: Error) => setShippingError(e.message)
      )
    }

    if (pricedByChoice && !data) {
      await clearCartMethod()
      return
    }

    const err = await trackCartUpdate(() =>
      setShippingMethod({
        cartId: cart.id,
        shippingMethodId: id,
        data,
      })
    ).catch((e: Error) => e.message)

    if (err) {
      if (pricedByChoice) {
        await clearCartMethod()
        return
      }

      setPendingOptionId(prev)
      setShippingError(err as string)
      return
    }
    const addr = cart.shipping_address
    const hasDeliveryFields = !!(
      addr?.address_1 ||
      addr?.address_2 ||
      addr?.city ||
      addr?.postal_code ||
      addr?.province ||
      addr?.company
    )

    if (isPickupShippingOption(selectedOption) && hasDeliveryFields) {
      await trackCartUpdate(() =>
        updateCart({
          shipping_address: {
            first_name: addr?.first_name || "",
            last_name: addr?.last_name || "",
            phone: addr?.phone || "",
            country_code: addr?.country_code || "",
            company: "",
            address_1: "",
            address_2: "",
            city: "",
            postal_code: "",
            province: "",
          },
        } as HttpTypes.StoreUpdateCart)
      ).catch((e: Error) => setShippingError(e.message))
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-row items-start justify-between gap-x-4">
        <div className="flex flex-col">
          <h2 className="h2-docs">{t("shippingHeading")}</h2>
          <p className="txt-compact-medium text-ui-fg-muted">
            {t("shippingDescription")}
          </p>
        </div>

        <DropdownMenu dir={dir}>
          <DropdownMenu.Trigger
            className={clx(
              "mb-6 flex items-center gap-x-1.5 txt-compact-medium-plus text-ui-fg-subtle hover:text-ui-fg-base transition-colors",
              isPending && "opacity-60 cursor-wait"
            )}
            disabled={isPending}
            data-testid="checkout-country-select"
          >
            {isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CursorDefault />
                <span>{selectedCountryOption?.label ?? "—"}</span>
              </>
            )}
          </DropdownMenu.Trigger>

          <DropdownMenu.Content
            align="end"
            className="w-48 max-h-60 overflow-y-auto no-scrollbar"
          >
            <DropdownMenu.RadioGroup
              value={selectedCountryOption?.country}
              onValueChange={handleRegionChange}
            >
              {countryOptions.map((opt) => (
                <DropdownMenu.RadioItem
                  key={opt.country}
                  value={opt.country}
                >
                  {opt.label}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      {/* Shipping method cards */}
      <div className="overflow-x-auto no-scrollbar px-px pb-1">
        {shippingOptions && shippingOptions.length > 0 ? (
          <RadioGroup
            dir={dir}
            value={shippingMethodId ?? undefined}
            onValueChange={handleSelectShipping}
            className="flex items-stretch gap-x-2"
          >
            {shippingOptions.map((option) => {
              const isSelected = option.id === shippingMethodId

              const deliveryLabel = formatDeliveryDays(getDeliveryDays(option))

              const priceAmount =
                option.price_type === "flat"
                  ? option.amount!
                  : calculatedPricesMap[option.id] !== undefined
                    ? calculatedPricesMap[option.id]
                    : null
              const isUnavailable =
                option.price_type === "calculated" &&
                !isLoadingPrices &&
                priceAmount === null &&
                !findShippingOptionDescriptor(option)?.pricedByChoice
              const isFreeShipping = priceAmount === 0
              const price = isFreeShipping
                ? t("freeShipping")
                : priceAmount !== null
                  ? convertToLocale({
                    amount: priceAmount,
                    currency_code: cart.currency_code,
                    locale,
                  })
                  : isLoadingPrices
                    ? null
                    : "—"

              return (
                <ShippingOptionCard
                  key={option.id}
                  cart={cart}
                  option={option}
                  isSelected={isSelected}
                  isUnavailable={isUnavailable}
                  price={price}
                  isLoadingPrice={price === null}
                  isFreeShipping={isFreeShipping}
                  deliveryLabel={deliveryLabel}
                  formatDeliveryDays={formatDeliveryDays}
                />
              )
            })}
          </RadioGroup>
        ) : (
          <p className="txt-compact-small text-ui-fg-subtle">
            {t("shippingUnavailable")}
          </p>
        )}
      </div>

      {shippingError && (
        <p className="txt-compact-small text-rose-500">
          {getErrorMessage(shippingError)}
        </p>
      )}
    </div>
  )
}
