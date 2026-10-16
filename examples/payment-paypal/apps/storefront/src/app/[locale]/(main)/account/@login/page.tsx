import type { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"
import { SITE_NAME } from "@lib/util/env"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.login")

  return {
    title: pageTitle(t("title")),
    description: t("description", { siteName: SITE_NAME }),
  }
}

export default function Login() {
  return <LoginTemplate />
}
