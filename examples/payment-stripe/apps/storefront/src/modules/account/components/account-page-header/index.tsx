import type React from "react"

type AccountPageHeaderProps = {
  heading: string
  description?: string
  children?: React.ReactNode
}

/** The same title block on every account page, so none of them drifts. */
const AccountPageHeader = ({
  heading,
  description,
  children,
}: AccountPageHeaderProps) => (
  <div className="mb-8 flex flex-col gap-y-2">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl-semi text-ui-fg-base">{heading}</h1>
      {children}
    </div>
    {description && (
      <p className="txt-medium text-ui-fg-subtle">{description}</p>
    )}
  </div>
)

export default AccountPageHeader
