import { Container } from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { SectionRow } from "../../../../../common/section-row"
import { Header } from "../../../../../common/header"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

type ApishipDefaultProductSizesSectionProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onEdit: () => void
}

export const ApishipDefaultProductSizesSection = ({
  apishipOptions,
  onEdit,
}: ApishipDefaultProductSizesSectionProps) => {
  const { t } = useTranslation()

  const defaultProductSizes = apishipOptions?.settings?.default_product_sizes

  return (
    <Container className="divide-y p-0">
      <Header
        title={t("apiship.defaultProductSizes.title")}
        subtitle={t("apiship.defaultProductSizes.subtitle")}
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
        title={t("apiship.defaultProductSizes.fields.length.label")}
        value={defaultProductSizes?.length ?? "-"}
      />
      <SectionRow
        title={t("apiship.defaultProductSizes.fields.width.label")}
        value={defaultProductSizes?.width ?? "-"}
      />
      <SectionRow
        title={t("apiship.defaultProductSizes.fields.height.label")}
        value={defaultProductSizes?.height ?? "-"}
      />
      <SectionRow
        title={t("apiship.defaultProductSizes.fields.weight.label")}
        value={defaultProductSizes?.weight ?? "-"}
      />
    </Container>
  )
}
