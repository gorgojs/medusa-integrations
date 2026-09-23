import { getTranslations } from "next-intl/server"
import { Button } from "@medusajs/ui"
import { Link } from "@i18n/navigation"

const SignInPrompt = async () => {
  const t = await getTranslations("SignInPrompt")
  return (
    <>
      <div className="bg-white flex items-center justify-between">
        <div>
          <h2 className="h2-docs">{t("heading")}</h2>
          <p className="txt-medium text-ui-fg-muted">{t("description")}</p>
        </div>
        <div>
          <Link href="/account">
            <Button
              variant="secondary"
              size="large"
              data-testid="sign-in-button"
            >
              {t("signIn")}
            </Button>
          </Link>
        </div>
      </div>
      <div className="h-px bg-ui-border-base w-full" />
    </>
  )
}

export default SignInPrompt
