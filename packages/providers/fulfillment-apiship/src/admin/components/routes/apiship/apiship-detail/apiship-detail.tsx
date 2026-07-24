import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Rss } from "@medusajs/icons"
import { useLocation, useNavigate } from "react-router-dom"
import { TwoColumnLayout } from "../../../layout/two-column"
import { ApishipGeneralSection } from "./components/apiship-general-section"
import { ApishipDefaultStoreAddressSection } from "./components/apiship-default-store-address-section"
import { ApishipDefaultProductSizesSection } from "./components/apiship-default-product-sizes-section"
import { ApishipConnectionsSection } from "./components/apiship-connection-section"
import {
  useApishipOptions,
  useApishipProviders,
} from "../../../../hooks/api/apiship"
import { ApishipGeneralEdit } from "../apiship-edit-general"
import { ApishipDefaultProductSizesEdit } from "../apiship-edit-default-product-sizes"
import { ApishipDefaultStoreAddressEdit } from "../apiship-edit-default-store-address"
import { ApishipPaymentAndTaxSection } from "./components/apiship-payment-and-tax-section"
import { ApishipPaymentAndTaxEdit } from "../apiship-edit-payment-and-tax"
import { ApishipConnectionCreate } from "../apiship-connection-create"
import { ApishipConnectionEdit } from "../apiship-edit-connection"

export const ApishipDetail = () => {
  const { apiship_options } = useApishipOptions()
  const { providers = [] } = useApishipProviders()

  const location = useLocation()
  const navigate = useNavigate()

  const searchParams = new URLSearchParams(location.search)
  const modal = searchParams.get("edit")

  const isEditGeneralOpen = modal === "general"
  const isEditDefaultProductSizesOpen = modal === "sizes"
  const isEditDefaultStoreAddressOpen = modal === "address"
  const isEditPaymentAndTaxOpen = modal === "payment-and-tax"
  const isCreateConnectionOpen = modal === "connection-create"

  const editingConnectionId = modal?.startsWith("ascon_") ? modal : null

  const editingConnection =
    apiship_options?.settings?.connections?.find(
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
      <TwoColumnLayout
        firstCol={
          <>
            <ApishipGeneralSection
              apishipOptions={apiship_options}
              onEdit={() => openModal("general")}
            />
            <ApishipDefaultStoreAddressSection
              apishipOptions={apiship_options}
              onEdit={() => openModal("address")}
            />
            <ApishipConnectionsSection
              apishipOptions={apiship_options}
              onCreate={() => openModal("connection-create")}
              providers={providers}
            />
          </>
        }
        secondCol={
          <>
            <ApishipPaymentAndTaxSection
              apishipOptions={apiship_options}
              onEdit={() => openModal("payment-and-tax")}
            />
            <ApishipDefaultProductSizesSection
              apishipOptions={apiship_options}
              onEdit={() => openModal("sizes")}
            />
          </>
        }
      />

      <ApishipGeneralEdit
        open={isEditGeneralOpen}
        onClose={closeModal}
        apishipOptions={apiship_options}
      />
      <ApishipDefaultProductSizesEdit
        open={isEditDefaultProductSizesOpen}
        onClose={closeModal}
        apishipOptions={apiship_options}
      />
      <ApishipDefaultStoreAddressEdit
        open={isEditDefaultStoreAddressOpen}
        onClose={closeModal}
        apishipOptions={apiship_options}
      />
      <ApishipPaymentAndTaxEdit
        open={isEditPaymentAndTaxOpen}
        onClose={closeModal}
        apishipOptions={apiship_options}
      />
      <ApishipConnectionCreate
        open={isCreateConnectionOpen}
        onClose={closeModal}
        providers={providers}
      />
      <ApishipConnectionEdit
        open={!!editingConnection}
        onClose={closeModal}
        apishipConnection={editingConnection}
      />
    </>
  )
}

export const config = defineRouteConfig({
  label: "ApiShip",
  icon: Rss,
})

export const handle = {
  breadcrumb: () => "ApiShip",
}