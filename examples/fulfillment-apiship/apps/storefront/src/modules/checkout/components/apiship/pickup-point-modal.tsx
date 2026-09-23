"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import {
  calculatePriceForShippingOption,
  retrieveApishipCalculation,
  retrieveApishipPoints,
} from "@lib/data/fulfillment"
import { XMark } from "@medusajs/icons"
import type { HttpTypes } from "@medusajs/types"
import { Button, Text } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useLocale, useTranslations } from "next-intl"
import PickupPointMap from "./pickup-point-map"
import TariffList from "./tariff-list"
import type { ApishipPoint, ApishipSelection, ApishipTariff } from "./types"
import { buildTariffsByPointId, extractPointIds } from "./utils"

type ApishipPickupPointModalProps = {
  open: boolean
  onClose: (cancelled?: boolean) => void
  cart: HttpTypes.StoreCart
  shippingOptionId: string | null
  selection: ApishipSelection | null
  providerNames: Record<string, string>
  onSelectionChange: (selection: ApishipSelection) => void
  onPriceUpdate: (shippingOptionId: string, amount: number) => void
}

/**
 * ApiShip reports opening hours keyed 1 to 7 from Monday. Naming the days through `Intl`
 * keeps all 36 storefront languages covered without seven more message keys per language.
 */
const useWeekdayNames = (locale: string) =>
  useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "long" })
    // 2024-01-01 was a Monday, so adding the key lands on the matching weekday.
    return (day: string) => {
      const index = Number(day)
      if (!Number.isFinite(index) || index < 1 || index > 7) return day
      return formatter.format(new Date(Date.UTC(2024, 0, index)))
    }
  }, [locale])

export default function ApishipPickupPointModal({
  open,
  onClose,
  cart,
  shippingOptionId,
  selection,
  providerNames,
  onSelectionChange,
  onPriceUpdate,
}: ApishipPickupPointModalProps) {
  const t = useTranslations("Apiship")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const weekdayName = useWeekdayNames(locale)

  const [points, setPoints] = useState<ApishipPoint[]>([])
  const [tariffsByPointId, setTariffsByPointId] = useState<
    Record<string, ApishipTariff[]>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [selectedTariffKey, setSelectedTariffKey] = useState<string | null>(null)

  const savedPointId = selection?.point?.id ?? null
  const savedTariffKey = selection?.tariff.key ?? null

  useEffect(() => {
    if (!open) return
    setSelectedPointId(savedPointId)
    setSelectedTariffKey(savedTariffKey)
    setError(null)
  }, [open, savedPointId, savedTariffKey, shippingOptionId])

  useEffect(() => {
    if (!open || !shippingOptionId) return

    let cancelled = false
    setIsLoading(true)
    setLoadFailed(false)

    void (async () => {
      const calculation = await retrieveApishipCalculation(
        cart.id,
        shippingOptionId
      )
      if (cancelled) return

      if (!calculation) {
        setLoadFailed(true)
        setTariffsByPointId({})
        setPoints([])
        setIsLoading(false)
        return
      }

      const byPointId = buildTariffsByPointId(calculation)
      setTariffsByPointId(byPointId)

      const resolved = await retrieveApishipPoints(
        cart.id,
        shippingOptionId,
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
  }, [open, shippingOptionId, cart.id])

  const activePoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? null,
    [points, selectedPointId]
  )

  const activeTariffs = useMemo(
    () => (selectedPointId ? (tariffsByPointId[selectedPointId] ?? []) : []),
    [tariffsByPointId, selectedPointId]
  )

  const selectedTariff = useMemo(
    () => activeTariffs.find((tariff) => tariff.key === selectedTariffKey) ?? null,
    [activeTariffs, selectedTariffKey]
  )

  const handleSelectPoint = (pointId: string) => {
    setSelectedPointId(pointId)
    setSelectedTariffKey(savedPointId === pointId ? savedTariffKey : null)
  }

  const handleConfirm = async () => {
    if (!shippingOptionId || !activePoint || !selectedTariff) return

    setIsSaving(true)
    setError(null)

    const next: ApishipSelection = {
      deliveryType: 2,
      tariff: selectedTariff,
      point: activePoint,
    }

    try {
      await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: shippingOptionId,
        data: { apishipData: next },
      })

      const priced = await calculatePriceForShippingOption(
        shippingOptionId,
        cart.id
      )
      if (priced?.id && typeof priced.amount === "number") {
        onPriceUpdate(priced.id, priced.amount)
      }

      onSelectionChange(next)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const close = () => onClose(!selection)

  return (
    <Transition show={open}>
      <Dialog onClose={close} className="relative z-50">
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px]"
            aria-hidden="true"
          />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4">
          <TransitionChild
            enter="ease-out duration-250"
            enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel className="relative flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-xl bg-ui-bg-base shadow-elevation-modal sm:h-[80dvh] sm:w-[calc(100vw-4rem)] sm:max-w-[1200px] sm:flex-row sm:rounded-xl">
              <button
                type="button"
                onClick={close}
                aria-label={tCommon("close")}
                className="absolute end-3 top-3 z-20 rounded-full bg-ui-bg-base p-1.5 text-ui-fg-muted shadow-elevation-card-rest hover:text-ui-fg-base transition-colors"
              >
                <XMark />
              </button>

              {/* Detail panel: the map fills the sheet until a point is picked. */}
              <div
                className={
                  activePoint
                    ? "flex h-1/2 w-full shrink-0 flex-col border-b border-ui-border-base sm:h-full sm:w-[380px] sm:border-b-0 sm:border-e"
                    : "hidden"
                }
              >
                {activePoint && (
                  <div className="flex flex-col gap-y-4 overflow-y-auto p-6">
                    <div className="flex flex-col pe-8">
                      <Text className="txt-compact-medium-plus text-ui-fg-base">
                        {providerNames[activePoint.providerKey ?? ""] ??
                          t("pickupPointModalTitle")}
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
                      providerNames={providerNames}
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
                      className="w-full"
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
                        {Object.entries(activePoint.worktime).map(
                          ([day, hours]) => (
                            <div
                              key={day}
                              className="flex justify-between txt-compact-small text-ui-fg-subtle"
                            >
                              <span>{weekdayName(day)}</span>
                              <span className="text-ui-fg-muted">{hours}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {!!activePoint.photos?.length && (
                      <div className="flex gap-x-2 overflow-x-auto no-scrollbar">
                        {activePoint.photos.map((src, index) => (
                          // The photos come from each carrier's own CDN, so the hosts
                          // are not known ahead of time and next/image cannot serve them.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={src}
                            src={src}
                            alt={t("photoAlt", { index: index + 1 })}
                            className="h-[100px] w-auto rounded-md border border-ui-border-base object-cover"
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
                )}
              </div>

              <div className="relative flex-1">
                <PickupPointMap
                  points={points}
                  isLoading={isLoading}
                  selectedPointId={selectedPointId}
                  onSelectPoint={handleSelectPoint}
                  lang={locale}
                />

                {!isLoading && !activePoint && points.length > 0 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
                    <Text className="rounded-full bg-ui-bg-base px-4 py-2 txt-compact-small text-ui-fg-subtle shadow-elevation-card-rest">
                      {t("selectPointPrompt")}
                    </Text>
                  </div>
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
