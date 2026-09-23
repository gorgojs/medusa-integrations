import type React from "react"
import { getTranslations } from "next-intl/server"

type ContentPageProps = {
  title: string
  description: string
  children?: React.ReactNode
}

/**
 * Layout for the static content pages the storefront links to from checkout,
 * registration and the order pages. All of them ship with placeholder copy, so
 * the note asking you to replace it lives here rather than on every page.
 */
const ContentPage = async ({
  title,
  description,
  children,
}: ContentPageProps) => {
  const t = await getTranslations("ContentPages")

  return (
    <div className="content-container flex flex-col gap-y-4 py-12 max-w-2xl">
      <h1 className="text-2xl-semi text-ui-fg-base">{title}</h1>
      <p className="text-base-regular text-ui-fg-base">{description}</p>
      {children}
      <p className="text-base-regular text-ui-fg-subtle">{t("placeholder")}</p>
    </div>
  )
}

export default ContentPage
