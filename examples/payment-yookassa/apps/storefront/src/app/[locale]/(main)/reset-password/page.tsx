import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import ResetPassword from "@modules/account/components/reset-password"
import { pageTitle } from "@lib/util/page-title"
import { NOINDEX } from "@lib/util/robots"

type Props = {
  searchParams: Promise<{ token?: string; email?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.resetPassword")

  return {
    title: pageTitle(t("title")),
    description: t("description"),
    robots: NOINDEX,
  }
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, email } = await searchParams

  return (
    <div className="w-full flex justify-center px-8 py-12">
      <ResetPassword token={token ?? ""} email={email} />
    </div>
  )
}
