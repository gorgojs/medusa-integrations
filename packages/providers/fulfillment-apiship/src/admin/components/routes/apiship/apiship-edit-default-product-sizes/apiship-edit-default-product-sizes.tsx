import { Heading, Drawer } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { EditApishipDefaultProductSizesForm } from "./components/edit-apiship-default-product-sizes-form/edit-apiship-default-product-sizes-form"


type ApishipDefaultProductSizesEditProps = {
  open: boolean
  onClose: () => void
  apishipOptions?: ApishipHttpTypes.AdminUpdateApishipOptions
  providerId?: string
}

export const ApishipDefaultProductSizesEdit = ({
  open,
  onClose,
  apishipOptions,
  providerId,
}: ApishipDefaultProductSizesEditProps) => {
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
            {t("apiship.defaultProductSizes.edit.header")}
          </Heading>
        </Drawer.Header>

        <EditApishipDefaultProductSizesForm
          apishipOptions={apishipOptions}
          onClose={onClose}
          providerId={providerId}
        />
      </Drawer.Content>
    </Drawer>
  )
}
