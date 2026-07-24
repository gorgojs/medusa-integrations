import { Heading, Drawer } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { EditApishipPaymentAndTaxForm } from "./components/edit-apiship-payment-and-tax-form/edit-apiship-payment-and-tax-form"

type ApishipPaymentAndTaxEditProps = {
  open: boolean
  onClose: () => void
  apishipOptions?: ApishipHttpTypes.AdminUpdateApishipOptions
}

export const ApishipPaymentAndTaxEdit = ({
  open,
  onClose,
  apishipOptions,
}: ApishipPaymentAndTaxEditProps) => {
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
            {t("apiship.paymentAndTax.edit.header")}
          </Heading>
        </Drawer.Header>

        <EditApishipPaymentAndTaxForm
          apishipOptions={apishipOptions}
          onClose={onClose}
        />
      </Drawer.Content>
    </Drawer>
  )
}
