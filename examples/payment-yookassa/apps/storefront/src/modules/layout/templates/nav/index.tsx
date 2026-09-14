import { getTranslations } from "next-intl/server"
import { Link } from "@i18n/navigation"

import { appLocales } from "@i18n/config"
import { listRegions } from "@lib/data/regions"
import { SITE_NAME } from "@lib/util/env"
import { getCountryCode } from "@lib/data/cookies"
import type { StoreRegion } from "@medusajs/types"
import { User } from "@medusajs/icons"
import CartButton from "@modules/layout/components/cart-button"
import RegionSelect from "@modules/layout/components/region-select"
import Search from "@modules/layout/components/search"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const t = await getTranslations()
  const [regions, countryCode] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    getCountryCode(),
  ])

  return (
    <div className="relative lg:sticky lg:top-0 inset-x-0 z-[60] group">
      <header className="relative h-[64px] border-b mx-auto duration-200 bg-white">
        <nav className="content-container txt-compact-xsmall text-ui-fg-subtle flex items-center gap-x-4 md:justify-between w-full h-full">
          <div className="flex flex-1 items-center h-full">
            <SideMenu />
          </div>

          <Link
            href="/"
            className="hidden lg:block shrink-0 txt-compact-medium font-semibold text-ui-fg-subtle uppercase hover:text-ui-fg-base transition-colors"
            data-testid="nav-store-link"
          >
            {SITE_NAME}
          </Link>

          <div className="ms-auto flex h-full flex-1 items-center justify-end gap-x-4 lg:ms-0">
            <Search className="hidden lg:inline-flex text-ui-fg-subtle hover:text-ui-fg-base transition-colors" />
            <div className="flex min-w-0">
              <RegionSelect
                regions={regions}
                currentCountryCode={countryCode ?? undefined}
                locales={appLocales}
                className="min-w-0"
              />
            </div>
            <Link
              className="hidden lg:block hover:text-ui-fg-base"
              href="/account"
              aria-label={t("Nav.account")}
              data-testid="nav-account-link"
            >
              <User />
            </Link>
            <div className="hidden h-full items-center lg:flex">
              <CartButton />
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
