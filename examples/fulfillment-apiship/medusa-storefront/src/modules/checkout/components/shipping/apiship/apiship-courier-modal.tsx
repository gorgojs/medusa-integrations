"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button, clx, Heading, IconButton, Text } from "@medusajs/ui"
import MedusaRadio from "@modules/common/components/radio"
import { Loader, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption, retrieveCalculation } from "@lib/data/fulfillment"
import {
  ApishipCalculation,
  ApishipTariff,
  Chosen
} from "./types"
import {
  buildTariffKey,
  days,
  useLatestRef,
  useLockBodyScroll
} from "./utils"

type ApishipCourierModalProps = {
  open: boolean
  onClose: (cancel?: boolean) => void
  cart: HttpTypes.StoreCart
  shippingOptionId: string | null
  initialChosen?: Chosen | null
  onPriceUpdate?: (shippingOptionId: string, amount: number) => void
  onError?: (message: string) => void
  onChosenChange: (chosen: Chosen | null) => void
  providersMap: Record<string, string>
}

export const ApishipCourierModal: React.FC<ApishipCourierModalProps> = ({
  open,
  onClose,
  cart,
  shippingOptionId,
  initialChosen,
  onPriceUpdate,
  onError,
  onChosenChange,
  providersMap,
}) => {
  const onErrorRef = useLatestRef(onError)
  const onPriceRef = useLatestRef(onPriceUpdate)

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCalc, setIsLoadingCalc] = useState(false)

  const [calculation, setCalculation] = useState<ApishipCalculation | null>(null)
  const [selectedTariffKey, setSelectedTariffKey] = useState<string | null>(null)

  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return

    if (initialChosen) {
      setSelectedTariffKey(initialChosen.tariff?.key ?? null)
      return
    }

    setSelectedTariffKey(null)
  }, [open, initialChosen, shippingOptionId])

  useEffect(() => {
    setSelectedTariffKey(null)
  }, [shippingOptionId])

  function useAsyncEffect(fn: (isCancelled: () => boolean) => Promise<void>, deps: any[]) {
    useEffect(() => {
      let cancelled = false
      const isCancelled = () => cancelled
      fn(isCancelled).catch((e) => console.error(e))
      return () => { cancelled = true }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  }

  useAsyncEffect(async (isCancelled) => {
    if (!open || !shippingOptionId) return

    setIsLoadingCalc(true)
    setCalculation(null)

    try {
      const calculation = await retrieveCalculation(cart.id, shippingOptionId)
      if (isCancelled()) return
      setCalculation(calculation)
    } catch (e: any) {
      console.error(e)
      onErrorRef.current?.(e?.message ?? "Failed to load calculation")
      setCalculation(null)
    } finally {
      if (!isCancelled()) setIsLoadingCalc(false)
    }
  }, [open, shippingOptionId, cart.id])

  const doorGroups = useMemo(() => {
    const seenKeys = new Set<string>()

    return (calculation?.deliveryToDoor ?? [])
      .map((g) => ({
        ...g,
        tariffs: (g.tariffs ?? []).filter((t, idx) => {
          const key = buildTariffKey(g.providerKey, t, idx)
          if (seenKeys.has(key)) return false
          seenKeys.add(key)
          return true
        }),
      }))
      .filter((g) => (g.tariffs?.length ?? 0) > 0)
  }, [calculation])

  const tariffsFlat = useMemo(() => {
    return doorGroups.flatMap((g) =>
      (g.tariffs ?? []).map((t, idx) => {
        const key = buildTariffKey(g.providerKey, t, idx)
        const full: ApishipTariff = {
          ...t,
          key,
          providerKey: g.providerKey,
        }
        return full
      })
    )
  }, [doorGroups])

  const selectedTariff = useMemo(() => {
    if (!selectedTariffKey) return null
    return tariffsFlat.find((t) => t.key === selectedTariffKey) ?? null
  }, [tariffsFlat, selectedTariffKey])

  const persistChosen = useCallback(async () => {
    if (!shippingOptionId || !selectedTariff) return

    setIsLoading(true)
    try {
      const next: Chosen = {
        deliveryType: 1,
        tariff: selectedTariff
      }

      await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: shippingOptionId,
        data: { apishipData: next },
      })

      const calc = await calculatePriceForShippingOption(shippingOptionId, cart.id)
      if (calc?.id && typeof calc.amount === "number") {
        onPriceRef.current?.(calc.id, calc.amount)
      }

      onChosenChange(next)
      onClose()
    } catch (e: any) {
      onErrorRef.current?.(e?.message ?? "Failed to save courier tariff")
    } finally {
      setIsLoading(false)
    }
  }, [cart.id, shippingOptionId, selectedTariff, onPriceRef, onChosenChange, onClose, onErrorRef])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose(initialChosen ? false : true)
        }}
      >
        <div className="relative w-[470px] max-w-[calc(100vw-32px)]">
          <div
            className="
              h-[820px] w-[470px]
              max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]
              overflow-hidden rounded-rounded border bg-white
              flex flex-col
            "
          >
            <div className=" flex flex-row justify-between items-center p-[35px] pb-0">
              <Heading
                level="h2"
                className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
              >
                By courier
              </Heading>
              <IconButton
                aria-label="Close"
                onClick={() => onClose(initialChosen ? false : true)}
                className="shadow-none"
              >
                <XMark />
              </IconButton>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-[35px] pt-[18px]">
              {isLoadingCalc ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader />
                </div>
              ) : doorGroups.length === 0 ? (
                <Text className="text-ui-fg-muted">No courier tariffs available.</Text>
              ) : (
                <div className="flex flex-col gap-[15px] pb-[18px]">
                  {doorGroups
                    .filter((g) => (g.tariffs?.length ?? 0) > 0)
                    .map((g) => (
                      <div key={g.providerKey} className="flex flex-col gap-[10px]">
                        <Text className="font-medium txt-medium text-ui-fg-base">
                          {providersMap[g.providerKey] ?? g.providerKey}
                        </Text>
                        <RadioGroup
                          value={selectedTariffKey}
                          onChange={(v) => setSelectedTariffKey(String(v))}
                          className="flex flex-col gap-[10px]"
                        >
                          {(g.tariffs ?? []).map((t, idx) => {
                            const k = buildTariffKey(g.providerKey, t, idx)
                            const checked = k === selectedTariffKey

                            const cost =
                              typeof t.deliveryCostOriginal === "number"
                                ? t.deliveryCostOriginal
                                : t.deliveryCost

                            return (
                              <Radio
                                key={k}
                                value={k}
                                className={clx(
                                  "flex items-center justify-between text-small-regular cursor-pointer py-2 border rounded-rounded pl-2 pr-3 hover:shadow-borders-interactive-with-active",
                                  { "border-ui-border-interactive": checked }
                                )}
                              >
                                <div className="flex gap-2 w-full">
                                  <MedusaRadio checked={checked} />
                                  <div className="flex flex-row w-full items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="txt-compact-small-plus">
                                        {t.tariffName}
                                      </span>
                                      <span className="txt-small text-ui-fg-subtle">
                                        Delivery time: {days(t as ApishipTariff)}
                                      </span>
                                    </div>
                                    <span className="txt-small-plus text-ui-fg-subtle">
                                      {typeof cost === "number" ? `RUB ${cost}` : "—"}
                                    </span>
                                  </div>
                                </div>
                              </Radio>
                            )
                          })}
                        </RadioGroup>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="p-[35px] pt-[18px] bg-white">
              <Button
                size="large"
                onClick={persistChosen}
                isLoading={isLoading}
                disabled={!selectedTariffKey || isLoadingCalc || selectedTariff?.key === initialChosen?.tariff.key}
                className="w-full"
              >
                Choose
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
