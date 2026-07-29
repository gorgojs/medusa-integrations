import { Heading, FocusModal } from "@medusajs/ui"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { ApishipConnectionCreateForm } from "./components/apiship-connection-create-form/apiship-connection-create-form"
import {useApishipAccountConnections} from "../../../../hooks/api/apiship"

type ApishipConnectionCreateProps = {
  open: boolean
  onClose: () => void
  providers: ApishipHttpTypes.AdminApishipProvider[]
  providerId?: string
}

export const ApishipConnectionCreate = ({
  open,
  onClose,
  providers,
  providerId,
}: ApishipConnectionCreateProps) => {
  const { account_connections = [] } = useApishipAccountConnections(providerId)

  return (
    <FocusModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <FocusModal.Content>
        <FocusModal.Header/>
        <ApishipConnectionCreateForm
          onClose={onClose}
          accountConnections={account_connections}
          providers={providers}
          providerId={providerId}
        />
      </FocusModal.Content>
    </FocusModal>
  )
}
