import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useLocation, useNavigate } from "react-router-dom"
import type { IntegrationSectionData } from "@gorgo/medusa-integration"
import { ApishipPaymentAndTaxSection } from "../components/routes/apiship/apiship-detail/components/apiship-payment-and-tax-section"
import { ApishipDefaultProductSizesSection } from "../components/routes/apiship/apiship-detail/components/apiship-default-product-sizes-section"
import { useApishipOptions } from "../hooks/api/apiship"
import { ApishipPaymentAndTaxEdit } from "../components/routes/apiship/apiship-edit-payment-and-tax"
import { ApishipDefaultProductSizesEdit } from "../components/routes/apiship/apiship-edit-default-product-sizes"

const ApishipIntegrationSideWidget = ({ data }: { data: IntegrationSectionData }) => {
  const providerId = data.providerId
  const { apiship_options } = useApishipOptions(providerId)

  const location = useLocation()
  const navigate = useNavigate()

  const searchParams = new URLSearchParams(location.search)
  const modal = searchParams.get("edit")

  const isEditPaymentAndTaxOpen = modal === "payment-and-tax"
  const isEditDefaultProductSizesOpen = modal === "sizes"

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
      <ApishipPaymentAndTaxSection
        apishipOptions={apiship_options}
        onEdit={() => openModal("payment-and-tax")}
      />
      <ApishipDefaultProductSizesSection
        apishipOptions={apiship_options}
        onEdit={() => openModal("sizes")}
      />

      <ApishipPaymentAndTaxEdit
        open={isEditPaymentAndTaxOpen}
        onClose={closeModal}
        apishipOptions={apiship_options}
        providerId={providerId}
      />
      <ApishipDefaultProductSizesEdit
        open={isEditDefaultProductSizesOpen}
        onClose={closeModal}
        apishipOptions={apiship_options}
        providerId={providerId}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "gorgo.integration.apiship.side.after",
})

export default ApishipIntegrationSideWidget
