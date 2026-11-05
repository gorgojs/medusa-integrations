"use client"
import { createTransferRequest } from "@lib/data/orders"
import { CheckCircleMiniSolid, XCircleSolid } from "@medusajs/icons"
import { Heading, IconButton, Input, Text } from "@medusajs/ui"
import { useActionState } from "react"
// TODO: Re-add Toaster component when needed
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useErrorMessage } from "@lib/util/use-error-message"

export default function TransferRequestForm() {
  const t = useTranslations("TransferRequest")
  const getErrorMessage = useErrorMessage()
  const [showSuccess, setShowSuccess] = useState(false)

  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  useEffect(() => {
    if (state.success && state.order) {
      setShowSuccess(true)
    }
  }, [state.success, state.order])

  return (
    <div className="flex flex-col gap-y-4 w-full">
      <div className="grid sm:grid-cols-2 items-center gap-x-8 gap-y-4 w-full">
        <div className="flex flex-col gap-y-1">
          <Heading level="h2" className="!text-sm font-semibold text-neutral-950">
            {t("heading")}
          </Heading>
          <p className="text-small-regular text-neutral-500">
            {t("cantFindOrder")}
            <br /> {t("connectOrder")}
          </p>
        </div>
        <form
          action={formAction}
          className="flex flex-col gap-y-1 sm:items-end"
        >
          <div className="flex flex-col gap-y-2 w-full">
            <Input className="w-full" name="order_id" placeholder={t("orderId")} />
            <p className="text-small-regular text-ui-fg-subtle">
              {t("whereToFind")}
            </p>
            <SubmitButton
              variant="secondary"
              size="small"
              className="w-fit whitespace-nowrap self-end"
            >
              {t("requestTransfer")}
            </SubmitButton>
          </div>
        </form>
      </div>
      {!state.success && state.error && (
        <Text className="text-base-regular text-rose-500 text-end">
          {getErrorMessage(state.error)}
        </Text>
      )}
      {showSuccess && state.order && (
        <div className="flex justify-between p-4 bg-neutral-50 shadow-borders-base w-full self-stretch items-center">
          <div className="flex gap-x-2 items-center">
            <CheckCircleMiniSolid className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col gap-y-1">
              <Text className="text-medim-pl text-neutral-950">
                {t("transferRequested", { orderId: state.order.id })}
              </Text>
              <Text className="text-base-regular text-neutral-600">
                {t("transferEmailSent", { email: state.order.email ?? "" })}
              </Text>
            </div>
          </div>
          <IconButton
            variant="transparent"
            className="h-fit"
            onClick={() => setShowSuccess(false)}
          >
            <XCircleSolid className="w-4 h-4 text-neutral-500" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
