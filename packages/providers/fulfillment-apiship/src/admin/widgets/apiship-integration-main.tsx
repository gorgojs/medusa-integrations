import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useLocation, useNavigate } from "react-router-dom"
import type { IntegrationSectionData } from "@gorgo/medusa-integration"
import { ApishipConnectionsSection } from "../components/routes/apiship/apiship-detail/components/apiship-connection-section"
import {
  useApishipOptions,
  useApishipProviders,
} from "../hooks/api/apiship"
import { ApishipConnectionCreate } from "../components/routes/apiship/apiship-connection-create"
import { ApishipConnectionEdit } from "../components/routes/apiship/apiship-edit-connection"

const ApishipIntegrationMainWidget = ({ data }: { data: IntegrationSectionData }) => {
  const providerId = data.providerId
  const { apiship_options } = useApishipOptions(providerId)
  const { providers = [] } = useApishipProviders(providerId)

  const location = useLocation()
  const navigate = useNavigate()

  const searchParams = new URLSearchParams(location.search)
  const modal = searchParams.get("edit")

  const isCreateConnectionOpen = modal === "connection-create"

  const editingConnectionId = modal?.startsWith("ascon_") ? modal : null

  const editingConnection =
    apiship_options?.connections?.find(
      (connection) => connection.id === editingConnectionId
    ) ?? undefined

  const openModal = (name: string) => {
    const nextParams = new URLSearchParams(location.search)
    nextParams.set("edit", name)

    navigate(
      {
        pathname: location.pathname,
        search: nextParams.toString(),
      },
      { replace: false }
    )
  }

  const closeModal = () => {
    const nextParams = new URLSearchParams(location.search)
    nextParams.delete("edit")

    navigate(
      {
        pathname: location.pathname,
        search: nextParams.toString(),
      },
      { replace: false }
    )
  }

  return (
    <>
      <ApishipConnectionsSection
        apishipOptions={apiship_options}
        onCreate={() => openModal("connection-create")}
        providers={providers}
        providerId={providerId}
      />

      <ApishipConnectionCreate
        open={isCreateConnectionOpen}
        onClose={closeModal}
        providers={providers}
        providerId={providerId}
      />
      <ApishipConnectionEdit
        open={!!editingConnection}
        onClose={closeModal}
        apishipConnection={editingConnection}
        providerId={providerId}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "gorgo.integration.apiship.main.after",
})

export default ApishipIntegrationMainWidget
