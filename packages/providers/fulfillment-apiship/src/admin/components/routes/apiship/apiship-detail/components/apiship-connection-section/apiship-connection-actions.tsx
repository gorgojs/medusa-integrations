import { PencilSquare, Trash } from "@medusajs/icons"
import { toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ActionMenu } from "../../../../../common/action-menu"
import { useDeleteApishipConnection } from "../../../../../../hooks/api/apiship"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

type ApishipConnectionActionsProps = {
  apishipConnection: ApishipHttpTypes.AdminApishipConnection
}

export const ApishipConnectionActions = ({
  apishipConnection,
}: ApishipConnectionActionsProps) => {
  const { t } = useTranslation()

  const navigate = useNavigate()
  const prompt = usePrompt()

  const { mutateAsync } = useDeleteApishipConnection(apishipConnection.id)

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("apiship.connections.delete.title"),
      description: t("apiship.connections.delete.description", {
        name: apishipConnection.name || apishipConnection.provider_key,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(t("apiship.connections.delete.successToast"))
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              label: t("actions.edit"),
              onClick: () => navigate(`?edit=${apishipConnection.id}`),
              icon: <PencilSquare />,
            },
          ],
        },
        {
          actions: [
            {
              label: t("actions.delete"),
              onClick: handleDelete,
              icon: <Trash />,
            },
          ],
        },
      ]}
    />
  )
}
