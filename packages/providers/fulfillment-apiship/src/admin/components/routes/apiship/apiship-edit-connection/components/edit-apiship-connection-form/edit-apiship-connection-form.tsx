import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Drawer, Switch, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../common/form"
import { KeyboundForm } from "../../../../../utilities/keybound-form"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { useUpdateApishipConnection } from "../../../../../../hooks/api/apiship"

type EditApishipConnectionFormProps = {
  apishipConnection?: ApishipHttpTypes.AdminApishipConnection
  onClose: () => void
}

const EditApishipConnectionSchema = z.object({
  is_enabled: z.boolean().default(true),
})

export const EditApishipConnectionForm = ({
  apishipConnection,
  onClose,
}: EditApishipConnectionFormProps) => {
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof EditApishipConnectionSchema>>({
    defaultValues: {
      is_enabled: apishipConnection?.is_enabled ?? true,
    },
    resolver: zodResolver(EditApishipConnectionSchema),
  })

  const { mutateAsync, isPending } = useUpdateApishipConnection(
    apishipConnection?.id ?? ""
  )

  useEffect(() => {
    form.reset({
      is_enabled: apishipConnection?.is_enabled ?? true,
    })
  }, [apishipConnection, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!apishipConnection) {
      toast.error(
        t("apiship.connections.form.errors.accountConnectionNotFound")
      )
      return
    }

    try {
      await mutateAsync({
        is_enabled: values.is_enabled,
      })

      toast.success(t("apiship.connections.edit.successToast"))
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? t("apiship.connections.edit.errorToast"))
    }
  })

  return (
    <Form {...form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <Drawer.Body className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-y-8">
            <Form.Field
              control={form.control}
              name="is_enabled"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <div className="flex items-center justify-between">
                    <Form.Label>
                      {t("apiship.connections.form.fields.enabled.label")}
                    </Form.Label>
                    <Form.Control>
                      <Switch
                        {...field}
                        checked={!!value}
                        className="rtl:rotate-180"
                        onCheckedChange={onChange}
                      />
                    </Form.Control>
                  </div>
                  <Form.Hint>
                    {t("apiship.connections.form.fields.enabled.hint")}
                  </Form.Hint>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </Drawer.Close>

            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </Drawer.Footer>
      </KeyboundForm>
    </Form>
  )
}
