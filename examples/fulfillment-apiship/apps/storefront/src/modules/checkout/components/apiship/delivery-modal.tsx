"use client"

import { useEffect, useMemo, useState } from "react"
import { setShippingMethod } from "@lib/data/cart"
import {
  retrieveApishipCalculation,
  retrieveApishipPoints,
} from "@lib/data/fulfillment"
import { Loader } from "@medusajs/icons"
import type { HttpTypes } from "@medusajs/types"
import { Button, Text } from "@medusajs/ui"
import CheckoutAddressForm from "@modules/checkout/components/checkout-address-sheet/address-form"
import {
  CheckoutModal,
  CheckoutModalBackButton,
} from "@modules/checkout/components/checkout-modal"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useShippingSelection } from "@modules/checkout/context/shipping-selection-context"
import { useLocale, useTranslations } from "next-intl"
import PickupPointMap from "./pickup-point-map"
import TariffList from "./tariff-list"
import type {
  ApishipCalculation,
  ApishipPoint,
  ApishipProvider,
  ApishipSelection,
  ApishipTariff,
} from "./types"
import {
  buildDoorGroups,
  buildTariffsByPointId,
  extractPointIds,
  getApishipDeliveryType,
  getApishipSelection,
} from "./utils"

type ApishipDeliveryModalProps = {
  open: boolean
  onClose: () => void
  cart: HttpTypes.StoreCart
  addresses: HttpTypes.StoreCustomerAddress[] | null
  option: HttpTypes.StoreCartShippingOptionWithServiceZone
  providers: Record<string, ApishipProvider>
}

/**
 * ApiShip needs an address before it can quote anything, so the flow is two steps in one
 * sheet. The first is the checkout's own address step, and only then does the second show
 * what the carriers offer for that address, a tariff list for courier delivery and a map
 * of pickup points for the rest.
 */
export default function ApishipDeliveryModal({
  open,
  onClose,
  cart,
  addresses,
  option,
  providers,
}: ApishipDeliveryModalProps) {
  const t = useTranslations("Apiship")
  const tCheckout = useTranslations("CheckoutPage")
  const locale = useLocale()
  const { getOptionData, setOptionData } = useShippingSelection()

  const toPoint = getApishipDeliveryType(option) === 2

  const [step, setStep] = useState<"address" | "choice">("address")
  const [calculation, setCalculation] = useState<ApishipCalculation | null>(null)
  const [points, setPoints] = useState<ApishipPoint[]>([])
  const [tariffsByPointId, setTariffsByPointId] = useState<
    Record<string, ApishipTariff[]>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [selectedTariffKey, setSelectedTariffKey] = useState<string | null>(null)

  const savedSelection =
    (getOptionData(option.id) as { apishipData?: ApishipSelection } | undefined)
      ?.apishipData ?? getApishipSelection(cart, option.id)
  const savedPointId = savedSelection?.point?.id ?? null
  const savedTariffKey = savedSelection?.tariff.key ?? null

  const hasAddress = Boolean(cart.shipping_address?.address_1)
  const addressKey = [
    cart.shipping_address?.country_code,
    cart.shipping_address?.province,
    cart.shipping_address?.city,
    cart.shipping_address?.postal_code,
    cart.shipping_address?.address_1,
    cart.shipping_address?.address_2,
  ].join("|")

  useEffect(() => {
    if (!open) return
    setError(null)
    setStep(hasAddress ? "choice" : "address")
  }, [open, hasAddress])

  useEffect(() => {
    if (!open) return
    setSelectedPointId(savedPointId)
    setSelectedTariffKey(savedTariffKey)
  }, [open, savedPointId, savedTariffKey])

  useEffect(() => {
    if (!open || step !== "choice") return

    let cancelled = false
    setIsLoading(true)
    setLoadFailed(false)

    void (async () => {
      const result = await retrieveApishipCalculation(cart.id, option.id)
      if (cancelled) return

      if (!result) {
        setLoadFailed(true)
        setCalculation(null)
        setTariffsByPointId({})
        setPoints([])
        setIsLoading(false)
        return
      }

      setCalculation(result)

      if (!toPoint) {
        setIsLoading(false)
        return
      }

      const byPointId = buildTariffsByPointId(result)
      setTariffsByPointId(byPointId)

      const resolved = await retrieveApishipPoints(
        cart.id,
        option.id,
        extractPointIds(byPointId)
      )
      if (cancelled) return

      if (!resolved) setLoadFailed(true)
      setPoints(resolved ?? [])
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, step, cart.id, option.id, toPoint, addressKey])

  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "long" }),
    [locale]
  )

  const doorGroups = useMemo(() => buildDoorGroups(calculation), [calculation])

  const activePoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? null,
    [points, selectedPointId]
  )

  const activeProvider = activePoint
    ? providers[activePoint.providerKey ?? ""]
    : undefined

  const activeTariffs = useMemo(
    () => (selectedPointId ? (tariffsByPointId[selectedPointId] ?? []) : []),
    [tariffsByPointId, selectedPointId]
  )

  const selectedTariff = useMemo(() => {
    const pool = toPoint
      ? activeTariffs
      : doorGroups.flatMap((group) => group.tariffs)
    return pool.find((tariff) => tariff.key === selectedTariffKey) ?? null
  }, [toPoint, activeTariffs, doorGroups, selectedTariffKey])

  const handleConfirm = async () => {
    if (!selectedTariff) return
    if (toPoint && !activePoint) return

    setIsSaving(true)
    setError(null)

    const next: ApishipSelection = {
      deliveryType: toPoint ? 2 : 1,
      tariff: selectedTariff,
      ...(toPoint && activePoint ? { point: activePoint } : {}),
    }

    try {
      await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: option.id,
        data: { apishipData: next },
      })
      setOptionData(option.id, { apishipData: next })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsSaving(false)
    }
  }

  const title =
    step === "address"
      ? tCheckout("addressModalTitle")
      : toPoint
        ? t("pickupPointModalTitle")
        : t("courierModalTitle")

  return (
    <CheckoutModal
      open={open}
      onClose={onClose}
      title={title}
      onBack={step === "choice" && !toPoint ? () => setStep("address") : undefined}
      wide={step === "choice" && toPoint}
    >
      {step === "address" ? (
        <CheckoutAddressForm
          cart={cart}
          addresses={addresses}
          onClose={onClose}
          onSaved={() => setStep("choice")}
          submitLabel={t("next")}
        />
      ) : toPoint ? (
        <div className="flex h-full w-full flex-col sm:flex-row">
          {activePoint && (
            <div className="flex h-1/2 w-full shrink-0 flex-col border-b border-ui-border-base sm:h-full sm:w-[380px] sm:border-b-0 sm:border-e">
              <div className="flex flex-col gap-y-4 overflow-y-auto px-6 pb-6 pt-4">
                <CheckoutModalBackButton
                  onClick={() => setStep("address")}
                  className="self-start"
                />
                <div className="flex flex-col gap-y-1 pe-8">
                  <Text className="txt-compact-medium-plus text-ui-fg-base">
                    {activeProvider?.name ?? t("pickupPointModalTitle")}
                  </Text>
                  <Text className="txt-compact-small text-ui-fg-subtle">
                    {activePoint.address}
                  </Text>
                </div>

                <TariffList
                  groups={[
                    {
                      providerKey: activePoint.providerKey ?? "",
                      tariffs: activeTariffs,
                    },
                  ]}
                  currencyCode={cart.currency_code}
                  providers={providers}
                  selectedKey={selectedTariffKey}
                  onSelect={setSelectedTariffKey}
                  showGroupNames={false}
                />

                <ErrorMessage
                  error={loadFailed ? t("loadFailed") : error}
                  data-testid="apiship-point-error"
                />

                <Button
                  size="large"
                  className="w-full shrink-0"
                  onClick={handleConfirm}
                  isLoading={isSaving}
                  disabled={!selectedTariff}
                  data-testid="apiship-point-submit"
                >
                  {t("choose")}
                </Button>

                {activePoint.worktime && (
                  <div className="flex flex-col gap-y-1">
                    <Text className="txt-compact-small-plus text-ui-fg-base">
                      {t("schedule")}
                    </Text>
                    {Object.entries(activePoint.worktime).map(([day, hours]) => (
                      <div
                        key={day}
                        className="flex justify-between txt-compact-small text-ui-fg-subtle"
                      >
                        <span>
                          {weekdayFormatter.format(
                            new Date(Date.UTC(2024, 0, Number(day)))
                          )}
                        </span>
                        <span className="text-ui-fg-muted">{hours}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!!activePoint.photos?.length && (
                  <div className="flex shrink-0 gap-x-2 overflow-x-auto no-scrollbar">
                    {activePoint.photos.map((src, index) => (
                      // The photos come from each carrier's own CDN, so the hosts are not
                      // known ahead of time and next/image cannot serve them.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt={t("photoAlt", { index: index + 1 })}
                        className="h-[100px] w-auto shrink-0 rounded-md border border-ui-border-base object-cover"
                      />
                    ))}
                  </div>
                )}

                {activePoint.description && (
                  <div className="flex flex-col">
                    <Text className="txt-compact-small-plus text-ui-fg-base">
                      {t("pointDetails")}
                    </Text>
                    <Text className="txt-compact-small text-ui-fg-subtle">
                      {activePoint.description}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <PickupPointMap
              points={points}
              isLoading={isLoading}
              selectedPointId={selectedPointId}
              providers={providers}
              onSelectPoint={(pointId) => {
                setSelectedPointId(pointId)
                setSelectedTariffKey(
                  savedPointId === pointId ? savedTariffKey : null
                )
              }}
              lang={locale}
            />

            {!activePoint && (
              <CheckoutModalBackButton
                onClick={() => setStep("address")}
                className="absolute start-6 top-4 z-20"
              />
            )}

            {!isLoading && !activePoint && points.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
                <Text className="rounded-full bg-ui-bg-base px-4 py-2 txt-compact-small text-ui-fg-subtle shadow-elevation-card-rest">
                  {t("selectPointPrompt")}
                </Text>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="pb-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader className="h-5 w-5 animate-spin text-ui-fg-muted" />
              </div>
            ) : doorGroups.length === 0 ? (
              <Text className="text-ui-fg-muted">{t("noTariffs")}</Text>
            ) : (
              <TariffList
                groups={doorGroups}
                currencyCode={cart.currency_code}
                providers={providers}
                selectedKey={selectedTariffKey}
                onSelect={setSelectedTariffKey}
              />
            )}
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-4 flex flex-col gap-y-4 bg-ui-bg-base px-6 pb-4 pt-4">
            <ErrorMessage
              error={loadFailed ? t("loadFailed") : error}
              data-testid="apiship-courier-error"
            />

            <Button
              size="large"
              className="w-full"
              onClick={handleConfirm}
              isLoading={isSaving}
              disabled={!selectedTariff || isLoading}
              data-testid="apiship-courier-submit"
            >
              {tCheckout("save")}
            </Button>
          </div>
        </div>
      )}
    </CheckoutModal>
  )
}
