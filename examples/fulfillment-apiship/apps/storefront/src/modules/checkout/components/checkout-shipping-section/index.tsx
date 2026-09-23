"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import {
  removeShippingMethodFromCart,
  setShippingMethod,
  updateCart,
  updateRegion,
} from "@lib/data/cart"
import {
  calculatePriceForShippingOption,
  retrieveApishipProviders,
} from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { getDeliveryDays, isPickupShippingOption } from "@lib/util/fulfillment"
import { useCartUpdate } from "@modules/checkout/context/cart-update-context"
import { Loader, CursorDefault } from "@medusajs/icons"
import { DropdownMenu, RadioGroup, clx } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useErrorMessage } from "@lib/util/use-error-message"
import { useLocaleDirection } from "@lib/hooks/use-locale-direction"
import {
  ApishipCourierModal,
  ApishipPickupPointModal,
  ApishipSelectionSummary,
  getApishipDeliveryType,
  isApishipOption,
  type ApishipSelection,
} from "@modules/checkout/components/apiship"

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

/**
 * The tariff and pickup point the customer already settled on. It rides along on the
 * shipping method, so a reload or a step back into the checkout finds it again.
 */
function readApishipSelection(cart: HttpTypes.StoreCart) {
  const data = cart.shipping_methods?.at(-1)?.data as {
    apishipData?: ApishipSelection
  } | null

  return data?.apishipData ?? null
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
  const tApiship = useTranslations("Apiship")
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
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const [apishipSelection, setApishipSelection] =
    useState<ApishipSelection | null>(readApishipSelection(cart))
  const [apishipProviderNames, setApishipProviderNames] = useState<
    Record<string, string>
  >({})
  const [openApishipModal, setOpenApishipModal] = useState<
    "courier" | "point" | null
  >(null)

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

  const shippingOptions = availableShippingOptions

  const activeShippingOption = useMemo(
    () => shippingOptions?.find((option) => option.id === shippingMethodId) ?? null,
    [shippingOptions, shippingMethodId]
  )

  const apishipDeliveryType = getApishipDeliveryType(activeShippingOption)

  // Any ApiShip option resolves the same provider instance, so one is enough to ask
  // which carriers it is connected to.
  const apishipOptionId = useMemo(
    () => shippingOptions?.find(isApishipOption)?.id,
    [shippingOptions]
  )

  const apishipSelectionKey = JSON.stringify(readApishipSelection(cart))

  useEffect(() => {
    setApishipSelection(JSON.parse(apishipSelectionKey) as ApishipSelection | null)
  }, [apishipSelectionKey])

  useEffect(() => {
    if (!apishipOptionId) return

    let cancelled = false

    retrieveApishipProviders(apishipOptionId).then((providers) => {
      if (cancelled || !providers) return

      setApishipProviderNames(
        Object.fromEntries(
          providers.flatMap((provider) =>
            provider.key && provider.name ? [[provider.key, provider.name]] : []
          )
        )
      )
    })

    return () => {
      cancelled = true
    }
  }, [apishipOptionId])

  const calculatedPriceKey = JSON.stringify({
    options:
      shippingOptions
        ?.filter((option) => option.price_type === "calculated")
        .map((option) => option.id) ?? [],
    cart: cart.id,
    updatedAt: cart.updated_at,
  })

  useEffect(() => {
    setIsLoadingPrices(true)
    if (!shippingOptions?.length) {
      setIsLoadingPrices(false)
      return
    }

    const calculatedMethods = shippingOptions.filter(
      (sm) => sm.price_type === "calculated"
    )

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

  const handleSelectShipping = async (id: string) => {
    setShippingError(null)
    const prev = shippingMethodId
    setShippingMethodId(id)
    // Picking an option writes a fresh shipping method, so whatever the customer chose
    // under the previous one is gone and the modal has to ask again.
    setApishipSelection(null)
    const err = await trackCartUpdate(() =>
      setShippingMethod({
        cartId: cart.id,
        shippingMethodId: id,
      })
    ).catch((e: Error) => e.message)
    if (err) {
      setShippingMethodId(prev)
      setShippingError(err as string)
      return
    }

    const selectedOption = shippingOptions?.find((option) => option.id === id)

    const deliveryType = getApishipDeliveryType(selectedOption)
    if (deliveryType) {
      setOpenApishipModal(deliveryType === 2 ? "point" : "courier")
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

  // Closing the modal without choosing leaves a shipping method ApiShip cannot act on,
  // so the method goes with it and the checkout is back to having none.
  const handleClearApishipSelection = async () => {
    const shippingMethod = cart.shipping_methods?.at(-1)
    setOpenApishipModal(null)
    setApishipSelection(null)
    setShippingMethodId(null)

    if (!shippingMethod) return

    await trackCartUpdate(() =>
      removeShippingMethodFromCart(shippingMethod.id)
    ).catch((e: Error) => setShippingError(e.message))
  }

  const apishipModalProps = {
    cart,
    shippingOptionId: shippingMethodId,
    selection: apishipSelection,
    providerNames: apishipProviderNames,
    onSelectionChange: setApishipSelection,
    onPriceUpdate: (optionId: string, amount: number) =>
      setCalculatedPricesMap((prev) => ({ ...prev, [optionId]: amount })),
    onClose: (cancelled?: boolean) => {
      setOpenApishipModal(null)
      if (cancelled) void handleClearApishipSelection()
    },
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
            // An empty string rather than undefined, so clearing the choice after a
            // dismissed ApiShip modal also clears the group's own checked state.
            value={shippingMethodId ?? ""}
            onValueChange={handleSelectShipping}
            className="flex items-stretch gap-x-2"
          >
            {shippingOptions.map((option) => {
              const isSelected = option.id === shippingMethodId

              const days = getDeliveryDays(option)
              const deliveryLabel = !days
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

              const priceAmount =
                option.price_type === "flat"
                  ? option.amount!
                  : calculatedPricesMap[option.id] !== undefined
                    ? calculatedPricesMap[option.id]
                    : null
              const isUnavailable =
                option.price_type === "calculated" &&
                !isLoadingPrices &&
                priceAmount === null
              const isFreeShipping = priceAmount === 0
              // Until the customer picks a tariff, ApiShip prices the cart with the
              // cheapest carrier it found, so the card says what it is, a starting price.
              const isApishipEstimate =
                isApishipOption(option) && !(isSelected && apishipSelection)
              const formattedPrice =
                priceAmount === null
                  ? null
                  : convertToLocale({
                    amount: priceAmount,
                    currency_code: cart.currency_code,
                    locale,
                  })
              const price = isFreeShipping
                ? t("freeShipping")
                : formattedPrice !== null
                  ? isApishipEstimate
                    ? tApiship("priceFrom", { price: formattedPrice })
                    : formattedPrice
                  : isLoadingPrices
                    ? null
                    : "—"

              return (
                <div
                  key={option.id}
                  className={clx(
                    "relative flex w-[180px] shrink-0 flex-col gap-2 justify-between rounded-md border bg-ui-bg-base p-3 text-start transition-colors",
                    isUnavailable
                      ? "border-ui-border-base opacity-60"
                      : "hover:bg-ui-bg-base-hover",
                    !isUnavailable &&
                    (isSelected
                      ? "border-ui-border-interactive"
                      : "border-ui-border-base hover:border-ui-border-interactive/50")
                  )}
                  data-testid="delivery-option-radio"
                >
                  <RadioGroup.Item
                    value={option.id}
                    aria-label={option.name}
                    disabled={isUnavailable}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer rounded-md bg-transparent outline-none [&>div]:hidden focus-visible:shadow-borders-interactive-with-focus disabled:cursor-not-allowed"
                  />
                  <span className="txt-compact-medium-plus text-ui-fg-base">
                    {option.name}
                  </span>
                  <div className="flex flex-col gap-y-0">
                    <div className="min-h-[20px]">
                      {deliveryLabel && (
                        <span className="txt-compact-small text-ui-fg-subtle">
                          {deliveryLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between gap-x-3">
                      <div
                        className={clx(
                          "txt-compact-small-plus flex min-h-[20px] items-end",
                          isFreeShipping
                            ? "text-ui-tag-green-icon"
                            : "text-ui-fg-subtle"
                        )}
                      >
                        {price === null ? (
                          <Loader className="h-3 w-3 animate-spin" />
                        ) : (
                          price
                        )}
                      </div>

                      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                        <div
                          className={clx(
                            "flex h-3.5 w-3.5 items-center justify-center rounded-full border bg-ui-bg-base shadow-borders-base",
                            isSelected
                              ? "border-ui-border-interactive bg-ui-bg-interactive shadow-borders-interactive-with-shadow"
                              : "border-ui-border-base"
                          )}
                        >
                          {isSelected && (
                            <div className="h-1.5 w-1.5 rounded-full bg-ui-bg-base shadow-details-contrast-on-bg-interactive" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </RadioGroup>
        ) : (
          <p className="txt-compact-small text-ui-fg-subtle">
            {t("shippingUnavailable")}
          </p>
        )}
      </div>

      {apishipSelection && apishipDeliveryType && (
        <ApishipSelectionSummary
          selection={apishipSelection}
          currencyCode={cart.currency_code}
          providerNames={apishipProviderNames}
          onEdit={() =>
            setOpenApishipModal(apishipDeliveryType === 2 ? "point" : "courier")
          }
          onRemove={handleClearApishipSelection}
        />
      )}

      <ApishipCourierModal
        {...apishipModalProps}
        open={openApishipModal === "courier"}
      />
      <ApishipPickupPointModal
        {...apishipModalProps}
        open={openApishipModal === "point"}
      />

      {shippingError && (
        <p className="txt-compact-small text-rose-500">
          {getErrorMessage(shippingError)}
        </p>
      )}
    </div>
  )
}
