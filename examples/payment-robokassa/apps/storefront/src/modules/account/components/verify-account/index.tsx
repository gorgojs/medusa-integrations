"use client"

import { confirmEmailVerification } from "@lib/data/customer"
import { Link } from "@i18n/navigation"
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

type Props = {
  token: string
}

type VerificationState = "verifying" | "success" | "error"

const VerifyAccount = ({ token }: Props) => {
  const t = useTranslations("VerifyAccount")
  const [state, setState] = useState<VerificationState>(
    token ? "verifying" : "error"
  )
  // The token works once. Strict Mode runs effects twice in development, and
  // the second run would turn a confirmed email into an "expired link".
  const requested = useRef(false)

  useEffect(() => {
    if (!token || requested.current) {
      return
    }
    requested.current = true

    confirmEmailVerification(token).then(({ success }) =>
      setState(success ? "success" : "error")
    )
  }, [token])

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center text-center"
      data-testid="verify-account-page"
    >
      <h1 className="text-large-semi uppercase mb-6">{t("heading")}</h1>

      <p
        role="status"
        className="text-base-regular text-ui-fg-base mb-8"
        data-testid={`verify-account-${state}`}
      >
        {state === "verifying" && t("verifying")}
        {state === "success" && t("success")}
        {state === "error" && t("invalid")}
      </p>

      {state !== "verifying" && (
        <Link
          href="/account"
          className="underline text-small-regular"
          data-testid="go-to-sign-in-link"
        >
          {t("goToSignIn")}
        </Link>
      )}
    </div>
  )
}

export default VerifyAccount
