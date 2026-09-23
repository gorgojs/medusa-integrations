"use client"

import { useEffect, useMemo, useState } from "react"
import { setShippingMethod } from "@lib/data/cart"
import {
  calculatePriceForShippingOption,
  retrieveApishipCalculation,
} from "@lib/data/fulfillment"
import type { HttpTypes } from "@medusajs/types"
import { Button, Text } from "@medusajs/ui"
import { Loader } from "@medusajs/icons"
import { CheckoutModal } from "@modules/checkout/components/checkout-modal"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useTranslations } from "next-intl"
import TariffList from "./tariff-list"
import type { ApishipCalculation, ApishipSelection } from "./types"
import { buildDoorGroups } from "./utils"

type ApishipCourierModalProps = {
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
 * Picks the carrier that brings the order to the address the customer entered. ApiShip
 * only quotes once the cart is known, so the list is fetched when the modal opens and the
 * choice is written back onto the shipping method.
 */
export default function ApishipCourierModal({
  open,
  onClose,
  cart,
  shippingOptionId,
  selection,
  providerNames,
  onSelectionChange,
  onPriceUpdate,
}: ApishipCourierModalProps) {
  const t = useTranslations("Apiship")

  const [calculation, setCalculation] = useState<ApishipCalculation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const savedTariffKey = selection?.tariff.key ?? null

  useEffect(() => {
    if (!open) return
    setSelectedKey(savedTariffKey)
    setError(null)
  }, [open, savedTariffKey, shippingOptionId])

  useEffect(() => {
    if (!open || !shippingOptionId) return

    let cancelled = false
    setIsLoading(true)
    setCalculation(null)
    setLoadFailed(false)

    retrieveApishipCalculation(cart.id, shippingOptionId)
      .then((result) => {
        if (cancelled) return
        if (!result) setLoadFailed(true)
        setCalculation(result)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, shippingOptionId, cart.id])

  const groups = useMemo(() => buildDoorGroups(calculation), [calculation])

  const selectedTariff = useMemo(
    () =>
      groups
        .flatMap((group) => group.tariffs)
        .find((tariff) => tariff.key === selectedKey) ?? null,
    [groups, selectedKey]
  )

  const handleConfirm = async () => {
    if (!shippingOptionId || !selectedTariff) return

    setIsSaving(true)
    setError(null)

    const next: ApishipSelection = {
      deliveryType: 1,
      tariff: selectedTariff,
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

  return (
    <CheckoutModal
      open={open}
      onClose={() => onClose(!selection)}
      title={t("courierModalTitle")}
    >
      <div className="flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader className="h-5 w-5 animate-spin text-ui-fg-muted" />
          </div>
        ) : groups.length === 0 ? (
          <Text className="text-ui-fg-muted">{t("noTariffs")}</Text>
        ) : (
          <TariffList
            groups={groups}
            currencyCode={cart.currency_code}
            providerNames={providerNames}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
          />
        )}

        <ErrorMessage
          error={loadFailed ? t("loadFailed") : error}
          data-testid="apiship-courier-error"
        />

        <Button
          size="large"
          className="w-full mt-4"
          onClick={handleConfirm}
          isLoading={isSaving}
          disabled={!selectedTariff || isLoading}
          data-testid="apiship-courier-submit"
        >
          {t("choose")}
        </Button>
      </div>
    </CheckoutModal>
  )
}
