import { Link } from "@i18n/navigation"
import { getTranslations } from "next-intl/server"

const Help = async () => {
  const t = await getTranslations("Help")

  return (
    <ul className="flex flex-col small:flex-row gap-x-8 gap-y-2 txt-medium">
      <li>
        <Link
          href="/contact"
          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        >
          {t("contact")}
        </Link>
      </li>
      <li>
        <Link
          href="/returns"
          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        >
          {t("returnsExchanges")}
        </Link>
      </li>
    </ul>
  )
}

export default Help
