"use client"

import { acceptTransferRequest, declineTransferRequest } from "@lib/data/orders"
import { Button, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useErrorMessage } from "@lib/util/use-error-message"

type TransferStatus = "pending" | "success" | "error"

const TransferActions = ({ id, token }: { id: string; token: string }) => {
  const t = useTranslations("TransferActions")
  const getErrorMessage = useErrorMessage()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<{
    accept: TransferStatus | null
    decline: TransferStatus | null
  } | null>({
    accept: null,
    decline: null,
  })

  const acceptTransfer = async () => {
    setStatus({ accept: "pending", decline: null })
    setErrorMessage(null)

    const { success, error } = await acceptTransferRequest(id, token)

    if (error) setErrorMessage(error)
    setStatus({ accept: success ? "success" : "error", decline: null })
  }

  const declineTransfer = async () => {
    setStatus({ accept: null, decline: "pending" })
    setErrorMessage(null)

    const { success, error } = await declineTransferRequest(id, token)

    if (error) setErrorMessage(error)
    setStatus({ accept: null, decline: success ? "success" : "error" })
  }

  return (
    <div className="flex flex-col gap-y-4">
      {status?.accept === "success" && (
        <Text className="text-emerald-500">
          {t("transferSuccess")}
        </Text>
      )}
      {status?.decline === "success" && (
        <Text className="text-emerald-500">
          {t("declineSuccess")}
        </Text>
      )}
      {status?.accept !== "success" && status?.decline !== "success" && (
        <div className="flex flex-wrap gap-3">
          <Button
            size="small"
            onClick={acceptTransfer}
            isLoading={status?.accept === "pending"}
            disabled={
              status?.accept === "pending" || status?.decline === "pending"
            }
          >
            {t("acceptTransfer")}
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={declineTransfer}
            isLoading={status?.decline === "pending"}
            disabled={
              status?.accept === "pending" || status?.decline === "pending"
            }
          >
            {t("declineTransfer")}
          </Button>
        </div>
      )}
      {errorMessage && (
        <Text className="text-red-500 text-sm">{getErrorMessage(errorMessage)}</Text>
      )}
    </div>
  )
}

export default TransferActions
