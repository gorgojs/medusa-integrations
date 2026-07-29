import { Heading, Drawer } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { EditApishipDefaultStoreAddressForm } from "./components/edit-apiship-default-store-address-form/edit-apiship-default-store-address-form"

type ApishipDefaultStoreAddressEditProps = {
  open: boolean
  onClose: () => void
  apishipOptions?: ApishipHttpTypes.AdminUpdateApishipOptions
  providerId?: string
}

export const ApishipDefaultStoreAddressEdit = ({
  open,
  onClose,
  apishipOptions,
  providerId,
}: ApishipDefaultStoreAddressEditProps) => {
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
            {t("apiship.defaultStoreAddress.edit.header")}
          </Heading>
        </Drawer.Header>

        <EditApishipDefaultStoreAddressForm
          apishipOptions={apishipOptions}
          onClose={onClose}
          providerId={providerId}
        />
      </Drawer.Content>
    </Drawer>
  )
}
