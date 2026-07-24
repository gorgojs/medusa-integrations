import { Heading, Drawer } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { EditApishipConnectionForm } from "./components/edit-apiship-connection-form/edit-apiship-connection-form"

type ApishipConnectionEditProps = {
  open: boolean
  onClose: () => void
  apishipConnection?: ApishipHttpTypes.AdminApishipConnection
}

export const ApishipConnectionEdit = ({
  open,
  onClose,
  apishipConnection,
}: ApishipConnectionEditProps) => {
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
            {t("apiship.connections.edit.header")}
          </Heading>
        </Drawer.Header>

        <EditApishipConnectionForm
          apishipConnection={apishipConnection}
          onClose={onClose}
        />
      </Drawer.Content>
    </Drawer>
  )
}
