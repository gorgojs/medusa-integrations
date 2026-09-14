"use client"

import Image from "next/image"
import {
  Popover,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { updateLineItem } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { Loader, ShoppingCart } from "@medusajs/icons"
import type { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import DeleteButton from "@modules/common/components/delete-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Link } from "@i18n/navigation"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

const CartDropdownItem = ({
  item,
  currencyCode,
  locale,
}: {
  item: HttpTypes.StoreCartLineItem
  currencyCode: string
  locale: string
}) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageUrl =
    item.thumbnail || item.variant?.product?.images?.[0]?.url || null

  const total = convertToLocale({
    amount: item.total ?? 0,
    currency_code: currencyCode,
    locale,
  })

  const unitPrice = convertToLocale({
    amount: item.unit_price ?? 0,
    currency_code: currencyCode,
    locale,
  })

  const variantTitle = item.variant?.title
  const maxQty = 10

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)
    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => setError(err.message))
      .finally(() => setUpdating(false))
  }

  return (
    <div className="py-1" data-testid="cart-item">
      <div className="flex items-center justify-between gap-x-3">
        <div className="flex items-center gap-x-3 min-w-0">
          <Link
            href={`/products/${item.product_handle}`}
            className="flex-shrink-0"
          >
            <div className="w-[72px] h-[72px] rounded-[6px] overflow-hidden bg-ui-bg-component shadow-elevation-card-rest flex items-center justify-center">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={item.product_title ?? ""}
                  width={72}
                  height={72}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <PlaceholderImage size={20} />
              )}
            </div>
          </Link>

          <div className="flex flex-col h-[72px] py-0.5 justify-between min-w-0">
            <Link
              href={`/products/${item.product_handle}`}
              className="txt-compact-medium-plus text-ui-fg-base truncate"
              data-testid="product-link"
            >
              {item.product_title}
            </Link>
            {variantTitle && (
              <span className="txt-compact-small text-ui-fg-subtle truncate">
                {variantTitle}
              </span>
            )}
            <div className="flex items-end h-[22px]">
              <DeleteButton id={item.id} data-testid="cart-item-remove-button" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end justify-end h-[72px] py-0.5 flex-shrink-0 gap-2">
          <span
            className="txt-compact-medium-plus text-ui-fg-base"
            data-testid="product-unit-price"
          >
            {item.quantity > 1 ? `${item.quantity} x ${unitPrice}` : total}
          </span>

          <div className="flex items-center justify-center gap-x-4 h-6 px-2 bg-ui-bg-component shadow-elevation-card-rest rounded-[6px]">
            <button
              type="button"
              onClick={() =>
                item.quantity > 1 && changeQuantity(item.quantity - 1)
              }
              disabled={updating || item.quantity <= 1}
              className="txt-compact-xlarge-plus text-ui-fg-subtle disabled:opacity-40 leading-none"
              data-testid="decrease-qty-button"
            >
              −
            </button>
            <span className="txt-compact-xsmall-plus text-ui-fg-subtle min-w-[12px] text-center">
              {updating ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                item.quantity
              )}
            </span>
            <button
              type="button"
              onClick={() =>
                item.quantity < maxQty && changeQuantity(item.quantity + 1)
              }
              disabled={updating || item.quantity >= maxQty}
              className="txt-compact-xlarge-plus text-ui-fg-subtle disabled:opacity-40 leading-none"
              data-testid="increase-qty-button"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {error && (
        <ErrorMessage error={error} data-testid="cart-item-error-message" />
      )}
    </div>
  )
}

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const t = useTranslations("CartDropdown")
  const tNav = useTranslations("Nav")
  const locale = useLocale()
  const [activeTimer, setActiveTimer] = useState<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <Link
          className="flex h-full items-center hover:text-ui-fg-base"
          href="/cart"
          aria-label={tNav("cart", { count: totalItems })}
          data-testid="nav-cart-link"
        >
          <div className="relative flex items-center leading-none">
            <ShoppingCart />
            {totalItems > 0 && (
              <span
                className="absolute -top-2 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-black text-white text-[10px] font-medium leading-none"
                data-testid="cart-item-count"
              >
                {totalItems}
              </span>
            )}
          </div>
        </Link>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+1px)] end-0 w-[420px] overflow-hidden border-x border-b border-gray-200 bg-white text-ui-fg-base"
            data-testid="nav-cart-dropdown"
          >
            <div className="p-4 flex items-center justify-center">
              <h3 className="text-large-semi">{t("heading")}</h3>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-scroll max-h-[402px] px-4 flex flex-col no-scrollbar">
                  {cartState.items
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item, idx) => (
                      <div key={item.id}>
                        <CartDropdownItem
                          item={item}
                          currencyCode={cartState.currency_code}
                          locale={locale}
                        />
                        {idx < cartState.items!.length - 1 && (
                          <div className="h-px bg-ui-border-base my-3" />
                        )}
                      </div>
                    ))}
                </div>
                <div className="p-4 flex flex-col gap-y-4 text-small-regular">
                  <div className="flex items-center justify-between">
                    <span className="text-ui-fg-base font-semibold">
                      {t("subtotal")}{" "}
                      <span className="font-normal">{t("subtotalNote")}</span>
                    </span>
                    <span
                      className="text-large-semi"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                        locale,
                      })}
                    </span>
                  </div>
                  <Link href="/cart">
                    <Button
                      className="w-full"
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      {t("goToCart")}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div>
                <div className="flex py-16 flex-col gap-y-4 items-center justify-center">
                  <div className="bg-gray-900 text-small-regular flex items-center justify-center w-6 h-6 rounded-full text-white">
                    <span>0</span>
                  </div>
                  <span>{t("bagEmpty")}</span>
                  <div>
                    <Link href="/store">
                      <>
                        <span className="sr-only">{t("exploreProducts")}</span>
                        <Button onClick={close}>{t("exploreProducts")}</Button>
                      </>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
