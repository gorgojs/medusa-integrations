import type { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { getCountryCode } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"
import AccountPageHeader from "@modules/account/components/account-page-header"
import { DEFAULT_REGION } from "@lib/util/env"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.addresses")

  return {
    title: pageTitle(t("title")),
    description: t("description"),
  }
}

export default async function Addresses() {
  const [countryCode, customer] = await Promise.all([
    getCountryCode(),
    retrieveCustomer(),
  ])
  const region = await getRegion(countryCode ?? DEFAULT_REGION)
  const t = await getTranslations("AddressesPage")

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <AccountPageHeader heading={t("heading")} description={t("description")} />
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
