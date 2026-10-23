"use client"

import { useActionState } from "react"
import { PASSWORD_MIN_LENGTH } from "@lib/util/password"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { Link } from "@i18n/navigation"
import { signup } from "@lib/data/customer"
import { useTranslations } from "next-intl"
import { SITE_NAME } from "@lib/util/env"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const t = useTranslations("Register")
  const [message, formAction] = useActionState(signup as (state: string | null, formData: FormData) => Promise<string | null>, null as string | null)

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        {t("heading", { siteName: SITE_NAME })}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        {t("description", { siteName: SITE_NAME })}
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t("firstName")}
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label={t("lastName")}
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label={t("email")}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={t("phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label={t("password")}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          {t("agreeText", { siteName: SITE_NAME })}{" "}
          <Link href="/privacy" className="underline">
            {t("privacyPolicy")}
          </Link>{" "}
          {t("and")}{" "}
          <Link href="/terms" className="underline">
            {t("termsOfUse")}
          </Link>
          .
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          {t("join")}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("alreadyMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          {t("signIn")}
        </button>
        .
      </span>
    </div>
  )
}

export default Register
