import {
  Container,
  Badge,
  Copy,
} from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { SectionRow } from "../../../../../common/section-row"
import { Header } from "../../../../../common/header"
import { prettifyRedactedToken, maskToken } from "../../../common/utils"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

type ApishipGeneralSectionProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onEdit: () => void
}

export const ApishipGeneralSection = ({
  apishipOptions,
  onEdit,
}: ApishipGeneralSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <Header
        title={t("apiship.general.title")}
        subtitle={t("apiship.general.subtitle")}
        actions={[
          {
            type: "action-menu",
            props: {
              groups: [
                {
                  actions: [
                    {
                      icon: <PencilSquare />,
                      label: t("actions.edit"),
                      onClick: onEdit,
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
      <SectionRow
        title={t("apiship.general.fields.token.label")}
        value={
          apishipOptions?.token ? (
            <div className="flex flex-row items-center gap-2">
              <Copy
                asChild
                content={apishipOptions.token}
                className="cursor-pointer"
              >
                <Badge size="2xsmall">
                  {prettifyRedactedToken(
                    maskToken(apishipOptions.token)
                  )}
                </Badge>
              </Copy>
            </div>
          ) : (
            "-"
          )
        }
      />
      <SectionRow
        title={t("apiship.general.fields.mode.label")}
        value={
          apishipOptions?.is_test === undefined ? (
            "-"
          ) : (
            <Badge size="2xsmall" className="block w-fit truncate">
              {apishipOptions.is_test
                ? t("statuses.test")
                : t("statuses.production")}
            </Badge>
          )
        }
      />
    </Container>
  )
}
