"use client"

import { requestPasswordResetForm } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"
import { useTranslations } from "next-intl"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const ForgotPassword = ({ setCurrentView }: Props) => {
  const t = useTranslations("ForgotPassword")
  const [state, formAction] = useActionState(requestPasswordResetForm, {
    success: false,
    error: null,
  })

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="forgot-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">{t("heading")}</h1>

      {state.success ? (
        <p
          className="text-center text-base-regular text-ui-fg-base mb-8"
          data-testid="forgot-password-sent"
        >
          {t("sent")}
        </p>
      ) : (
        <>
          <p className="text-center text-base-regular text-ui-fg-base mb-8">
            {t("description")}
          </p>
          <form className="w-full" action={formAction}>
            <Input
              label={t("email")}
              name="email"
              type="email"
              title={t("emailTitle")}
              autoComplete="email"
              required
              data-testid="email-input"
            />
            {/* Not `ErrorMessage`, which maps whatever it receives back
                through the generic error table and would flatten this into
                "something went wrong". */}
            {state.error ? (
              <div
                className="pt-2 text-rose-500 text-small-regular"
                data-testid="forgot-password-error-message"
              >
                <span>{t(state.error)}</span>
              </div>
            ) : null}
            <SubmitButton
              size="large"
              data-testid="send-reset-link-button"
              className="w-full mt-6"
            >
              {t("submit")}
            </SubmitButton>
          </form>
        </>
      )}

      {/* Medusa sends nothing for an address that never registered, and it
          answers the same way either way so the form cannot be used to probe
          for accounts. That leaves a guest who checked out without signing up
          waiting for an email that will never arrive, so point them at
          registration. Shown to everyone, which is what keeps it from
          disclosing anything. */}
      <p className="text-center text-ui-fg-subtle text-small-regular mt-8">
        {t("guestPrompt")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
          data-testid="guest-register-button"
        >
          {t("guestAction")}
        </button>
      </p>

      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
          data-testid="back-to-sign-in-button"
        >
          {t("backToSignIn")}
        </button>
      </span>
    </div>
  )
}

export default ForgotPassword
