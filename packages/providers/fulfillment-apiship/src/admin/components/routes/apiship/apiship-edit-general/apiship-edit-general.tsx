import { Heading, Drawer } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { EditApishipGeneralForm } from "./components/edit-apiship-general-form/edit-apiship-general-form"

type ApishipGeneralEditProps = {
  open: boolean
  onClose: () => void
  apishipOptions?: ApishipHttpTypes.AdminUpdateApishipOptions
}

export const ApishipGeneralEdit = ({
  open,
  onClose,
  apishipOptions,
}: ApishipGeneralEditProps) => {
  const { t } = useTranslation()

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <Drawer.Content>
        <Drawer.Header>
          <Heading>
            {t("apiship.general.edit.header")}
          </Heading>
        </Drawer.Header>

        <EditApishipGeneralForm
          apishipOptions={apishipOptions}
          onClose={onClose}
        />
      </Drawer.Content>
    </Drawer>
  )
}
