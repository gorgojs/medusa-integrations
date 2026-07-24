import { Container } from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { SectionRow } from "../../../../../common/section-row"
import { Header } from "../../../../../common/header"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { getCountryByIso2 } from "../../../../../../lib/data/countries"

type ApishipDefaultStoreAddressSectionProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onEdit: () => void
}

export const ApishipDefaultStoreAddressSection = ({
  apishipOptions,
  onEdit,
}: ApishipDefaultStoreAddressSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <Header
        title={t("apiship.defaultStoreAddress.title")}
        subtitle={t("apiship.defaultStoreAddress.subtitle")}
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
        title={t("apiship.defaultStoreAddress.fields.countryCode.label")}
        value={
          apishipOptions?.settings?.default_sender_settings?.country_code
            ? getCountryByIso2(
                apishipOptions.settings.default_sender_settings.country_code
              )?.display_name ?? "-"
            : "-"
        }
      />
      <SectionRow
        title={t("apiship.defaultStoreAddress.fields.address.label")}
        value={
          apishipOptions?.settings?.default_sender_settings?.address_string
            ? apishipOptions.settings.default_sender_settings.address_string
            : "-"
        }
      />
      <SectionRow
        title={t("apiship.defaultStoreAddress.fields.contactName.label")}
        value={
          apishipOptions?.settings?.default_sender_settings?.contact_name
            ? apishipOptions.settings.default_sender_settings.contact_name
            : "-"
        }
      />
      <SectionRow
        title={t("apiship.defaultStoreAddress.fields.phone.label")}
        value={
          apishipOptions?.settings?.default_sender_settings?.phone
            ? apishipOptions.settings.default_sender_settings.phone
            : "-"
        }
      />
    </Container>
  )
}
