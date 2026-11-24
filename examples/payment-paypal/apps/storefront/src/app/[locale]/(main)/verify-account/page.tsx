import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import VerifyAccount from "@modules/account/components/verify-account"
import { pageTitle } from "@lib/util/page-title"
import { NOINDEX } from "@lib/util/robots"

type Props = {
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.verifyAccount")

  return {
    title: pageTitle(t("title")),
    description: t("description"),
    robots: NOINDEX,
  }
}

export default async function VerifyAccountPage({ searchParams }: Props) {
  const { token } = await searchParams

  return (
    <div className="w-full flex justify-center px-8 py-12">
      <VerifyAccount token={token ?? ""} />
    </div>
  )
}
