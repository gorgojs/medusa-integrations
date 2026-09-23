import type { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"
import AccountPageHeader from "@modules/account/components/account-page-header"
import { SITE_NAME } from "@lib/util/env"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.profile")

  return {
    title: pageTitle(t("title")),
    description: t("description", { siteName: SITE_NAME }),
  }
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()
  const t = await getTranslations("ProfilePage")

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <AccountPageHeader heading={t("heading")} description={t("description")} />
      <div className="flex flex-col gap-y-8 w-full">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        {/* <ProfilePassword customer={customer} />
        <Divider /> */}
        <ProfileBillingAddress customer={customer} regions={regions} />
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}
