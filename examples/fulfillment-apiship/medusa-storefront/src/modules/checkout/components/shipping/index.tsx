"use client"

import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod, removeShippingMethodFromCart } from "@lib/data/cart"
import { calculatePriceForShippingOption, retrieveProviders } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, clx, Heading, Text } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import MedusaRadio from "@modules/common/components/radio"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ApishipPickupPointModal,
  ApishipCourierModal,
  ApishipChosen,
  days
} from "./apiship"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

function formatAddress(address: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const [providersMap, setProvidersMap] = useState<Record<string, string>>({})
  const [apishipChosen, setApishipChosen] = useState<any | null>(null)
  const [apishipPickupPointModalOpen, setApishipPickupPointModalOpen] = useState(false)
  const [apishipCourierModalOpen, setApishipCourierModalOpen] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type !== "pickup"
  )

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type === "pickup"
  )

  const hasPickupOptions = !!_pickupMethods?.length

  const isApishipCalculated = (option?: HttpTypes.StoreCartShippingOption | null) =>
    option?.price_type === "calculated" && option?.provider_id === "apiship_apiship"

  const isApishipToDoor = (option?: HttpTypes.StoreCartShippingOption | null) =>
    isApishipCalculated(option) && option?.data?.deliveryType === 1

  const isApishipToPoint = (option?: HttpTypes.StoreCartShippingOption | null) =>
    isApishipCalculated(option) && option?.data?.deliveryType === 2

  const activeShippingOption = useMemo(() => {
    return _shippingMethods?.find((option) => option.id === shippingMethodId) ?? null
  }, [_shippingMethods, shippingMethodId])

  const apishipMode = useMemo<"point" | "door" | null>(() => {
    if (!isOpen || !shippingMethodId) return null
    if (isApishipToPoint(activeShippingOption)) return "point"
    if (isApishipToDoor(activeShippingOption)) return "door"
    return null
  }, [isOpen, shippingMethodId, activeShippingOption])

  useEffect(() => {
    setApishipChosen(cart.shipping_methods?.at(-1)?.data?.apishipData ?? null)
  }, [cart.shipping_methods])

  useEffect(() => {
    if (!isOpen) return

    if (!apishipMode) {
      setApishipPickupPointModalOpen(false)
      setApishipCourierModalOpen(false)
      setApishipChosen(null)
      return
    }
    const chosenMode =
      apishipChosen?.deliveryType === 2 ? "point"
        : apishipChosen?.deliveryType === 1 ? "door"
          : null

    const hasValidChosen = !!apishipChosen && chosenMode === apishipMode
    if (hasValidChosen) {
      setApishipPickupPointModalOpen(false)
      setApishipCourierModalOpen(false)
      return
    }
    if (apishipMode === "point") {
      setApishipPickupPointModalOpen(true)
      setApishipCourierModalOpen(false)
    } else {
      setApishipCourierModalOpen(true)
      setApishipPickupPointModalOpen(false)
    }
  }, [isOpen, apishipMode, apishipChosen])

  useEffect(() => {
    let cancelled = false

      ; (async () => {
        const response = await retrieveProviders(shippingMethodId ?? undefined)
        const providers = response?.providers
        if (cancelled) return

        const map: Record<string, string> = {}
        for (const provider of providers ?? []) {
          if (!provider.key || !provider.name) {
            continue
          }

          map[provider.key] = provider.name
        }
        setProvidersMap(map)
      })()

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    if (!apishipChosen) return

    if (!apishipMode) {
      setApishipChosen(null)
      return
    }

    const chosenMode = apishipChosen.deliveryType === 2 ? "point" : "door"
    if (chosenMode !== apishipMode) {
      setApishipChosen(null)
    }
  }, [isOpen, apishipMode, apishipChosen])

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => (pricesMap[p.value?.id || ""] = p.value?.amount!))

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      }
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)

        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && cart.shipping_methods?.length === 0,
            }
          )}
        >
          Delivery
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                Edit
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-medium txt-medium text-ui-fg-base">
                Shipping method
              </span>
              <span className="mb-4 text-ui-fg-muted txt-medium">
                How would you like you order delivered
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(value) => {
                      const id = _pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id

                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                        {
                          "border-ui-border-interactive":
                            showPickupOptions === PICKUP_OPTION_ON,
                        }
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="text-base-regular">
                          Pick up your order
                        </span>
                      </div>
                      <span className="justify-self-end text-ui-fg-base">
                        -
                      </span>
                    </Radio>
                  </RadioGroup>
                )}
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      return handleSetShippingMethod(v, "shipping")
                    }
                  }}
                >
                  {_shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                          {
                            "border-ui-border-interactive":
                              option.id === shippingMethodId,
                            "hover:shadow-brders-none cursor-not-allowed":
                              isDisabled,
                          }
                        )}
                      >
                        <div className="flex items-center gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="text-base-regular">
                            {option.name}
                          </span>
                        </div>
                        <span className="justify-self-end text-ui-fg-base">
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : calculatedPricesMap[option.id] ? (
                            option.provider_id === "apiship_apiship" ? (
                              "from " + convertToLocale({
                                amount: calculatedPricesMap[option.id],
                                currency_code: cart?.currency_code,
                              })
                            ) :
                              convertToLocale({
                                amount: calculatedPricesMap[option.id],
                                currency_code: cart?.currency_code,
                              })
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
                <ApishipPickupPointModal
                  open={apishipPickupPointModalOpen}
                  onClose={async (cancel?: boolean) => {
                    setApishipPickupPointModalOpen(false)
                    if (cancel) {
                      await removeShippingMethodFromCart(cart.shipping_methods?.[0]?.id!)
                      setShippingMethodId(null)
                    }
                  }}
                  cart={cart}
                  shippingOptionId={shippingMethodId}
                  initialChosen={apishipChosen?.deliveryType === 2 ? apishipChosen : null}
                  onPriceUpdate={(id, amount) => {
                    setCalculatedPricesMap((prev) => ({ ...prev, [id]: amount }))
                  }}
                  onError={(msg) => setError(msg)}
                  onChosenChange={(chosen) => setApishipChosen(chosen)}
                  providersMap={providersMap}
                />
                <ApishipCourierModal
                  open={apishipCourierModalOpen}
                  onClose={async (cancel?: boolean) => {
                    setApishipCourierModalOpen(false)
                    if (cancel) {
                      await removeShippingMethodFromCart(cart.shipping_methods?.[0]?.id!)
                      setShippingMethodId(null)
                    }
                  }}
                  cart={cart}
                  shippingOptionId={shippingMethodId}
                  initialChosen={apishipChosen?.deliveryType === 1 ? apishipChosen : null}
                  onPriceUpdate={(id, amount) => {
                    setCalculatedPricesMap((prev) => ({ ...prev, [id]: amount }))
                  }}
                  onError={(msg) => setError(msg)}
                  onChosenChange={(chosen) => setApishipChosen(chosen)}
                  providersMap={providersMap}
                />
                {apishipChosen && (
                  <ApishipChosen
                    chosen={apishipChosen}
                    onRemove={async () => {
                      await removeShippingMethodFromCart(cart.shipping_methods?.[0]?.id!)
                      setApishipChosen(null)
                      setShippingMethodId(null)
                    }}
                    onEdit={() => {
                      if (apishipMode === "point") setApishipPickupPointModalOpen(true)
                      if (apishipMode === "door") setApishipCourierModalOpen(true)
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid">
              <div className="flex flex-col">
                <span className="font-medium txt-medium text-ui-fg-base">
                  Store
                </span>
                <span className="mb-4 text-ui-fg-muted txt-medium">
                  Choose a store near you
                </span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 md:pt-0 pt-2">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => {
                      if (v) {
                        return handleSetShippingMethod(v, "pickup")
                      }
                    }}
                  >
                    {_pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                            {
                              "border-ui-border-interactive":
                                option.id === shippingMethodId,
                              "hover:shadow-brders-none cursor-not-allowed":
                                option.insufficient_inventory,
                            }
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-base-regular">
                                {option.name}
                              </span>
                              <span className="text-base-regular text-ui-fg-muted">
                                {formatAddress(
                                  option.service_zone?.fulfillment_set?.location
                                    ?.address
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="justify-self-end text-ui-fg-base">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="mt"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={
                !cart.shipping_methods?.[0] ||
                shippingMethodId === null ||
                (
                  (_shippingMethods?.find((o) => o.id === shippingMethodId)?.provider_id === "apiship_apiship")
                  && !apishipChosen
                )
              }
              data-testid="submit-delivery-option-button"
            >
              Continue to payment
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Method
                </Text>
                <div className="flex flex-col">
                  <Text className="txt-medium text-ui-fg-subtle">
                    {cart.shipping_methods!.at(-1)!.name}
                  </Text>
                  {(apishipChosen && apishipChosen.point?.address) && (
                    <Text className="txt-medium text-ui-fg-subtle">
                      {apishipChosen.point.address}
                    </Text>
                  )}
                  {apishipChosen && (
                    <Text className="txt-medium text-ui-fg-subtle">
                      {
                        [apishipChosen?.tariff?.tariffName,
                        typeof (typeof apishipChosen.tariff.deliveryCostOriginal === "number"
                          ? apishipChosen.tariff.deliveryCostOriginal
                          : apishipChosen.tariff.deliveryCost) === "number"
                          ? `RUB ${(typeof apishipChosen.tariff.deliveryCostOriginal === "number"
                            ? apishipChosen.tariff.deliveryCostOriginal
                            : apishipChosen.tariff.deliveryCost)}` : "RUB —",
                        days?.(apishipChosen?.tariff) || null,
                        ].filter(Boolean).join(" · ")
                      }
                    </Text>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
