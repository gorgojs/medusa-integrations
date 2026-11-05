"use client"

import { Popover, PopoverPanel, Transition, PopoverButton } from "@headlessui/react"
import useScrollLock from "@lib/hooks/use-scroll-lock"
import { SITE_NAME } from "@lib/util/env"
import { BarsThree, XMark } from "@medusajs/icons"
import { Link } from "@i18n/navigation"
import { Text } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import { Fragment } from "react"

const ScrollLock = ({ enabled }: { enabled: boolean }) => {
  useScrollLock(enabled)
  return null
}

const sideMenuItems = [
  { key: "home" as const, href: "/" },
  { key: "store" as const, href: "/store" },
  { key: "account" as const, href: "/account" },
  { key: "cart" as const, href: "/cart" },
]

const SideMenu = () => {
  const t = useTranslations()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <ScrollLock enabled={open} />
              <div className="relative flex h-full">
                <PopoverButton
                  aria-label={t("SideMenu.menuButton")}
                  data-testid="nav-menu-button"
                  className="relative h-full flex gap-1 items-center transition-all ease-out duration-200 focus:outline-none hover:text-ui-fg-base txt-compact-xsmall"
                >
                  <BarsThree />
                </PopoverButton>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/0 pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <PopoverPanel className="flex flex-col fixed inset-0 sm:end-auto sm:w-1/3 2xl:w-1/4 sm:min-w-min z-[51] text-sm text-ui-fg-on-color m-2 rounded-rounded backdrop-blur-2xl">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-[rgba(3,7,18,0.5)] rounded-rounded justify-between p-6"
                  >
                    <div className="flex justify-end" id="xmark">
                      <button
                        data-testid="close-menu-button"
                        aria-label={t("Common.close")}
                        onClick={close}
                      >
                        <XMark />
                      </button>
                    </div>
                    <ul className="flex flex-col gap-6 items-start justify-start">
                      {sideMenuItems.map(({ key, href }) => (
                        <li key={key}>
                          <Link
                            href={href}
                            className="text-3xl leading-10 hover:text-ui-fg-disabled"
                            onClick={close}
                            data-testid={`${key}-link`}
                          >
                            {t(`SideMenu.items.${key}`)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-y-6">
                      <Text className="flex justify-between txt-compact-small">
                        {t("SideMenu.copyright", {
                          year: new Date().getFullYear(),
                          siteName: SITE_NAME,
                        })}
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
