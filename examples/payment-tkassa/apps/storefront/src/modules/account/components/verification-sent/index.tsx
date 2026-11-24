import { useTranslations } from "next-intl"

type Props = {
  email: string
  "data-testid"?: string
}

/** Tells the customer where the confirmation link went. */
const VerificationSent = ({ email, "data-testid": dataTestid }: Props) => {
  const t = useTranslations("VerifyAccount")

  return (
    <div
      role="status"
      className="w-full mb-6 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-4 text-center text-base-regular text-ui-fg-base"
      data-testid={dataTestid}
    >
      {t("linkSent", { email })}
    </div>
  )
}

export default VerificationSent
