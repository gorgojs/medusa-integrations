import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Drawer, Input, Select, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../common/form"
import { KeyboundForm } from "../../../../../utilities/keybound-form"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { useUpdateApishipOptions } from "../../../../../../hooks/api/apiship"

type EditApishipGeneralFormProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onClose: () => void
}

const EditApishipGeneralSchema = z.object({
  token: z.string().optional(),
  mode: z.enum(["test", "production"]),
})

export const EditApishipGeneralForm = ({
  apishipOptions,
  onClose,
}: EditApishipGeneralFormProps) => {
  const { t } = useTranslation()
  const { mutateAsync, isPending } = useUpdateApishipOptions()

  const form = useForm<z.infer<typeof EditApishipGeneralSchema>>({
    defaultValues: {
      token: apishipOptions?.token ?? "",
      mode:
        apishipOptions?.is_test === undefined
          ? undefined
          : apishipOptions.is_test
            ? "test"
            : "production",
    },
    resolver: zodResolver(EditApishipGeneralSchema),
  })

  useEffect(() => {
    form.reset({
      token: apishipOptions?.token ?? "",
      mode:
        apishipOptions?.is_test === undefined
          ? undefined
          : apishipOptions.is_test
            ? "test"
            : "production",
    })
  }, [apishipOptions, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        token: values.token,
        is_test: values.mode === "test",
      }

      await mutateAsync(payload)

      toast.success(t("apiship.general.edit.successToast"))
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? t("apiship.general.edit.errorToast"))
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
              name="token"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.general.fields.token.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      placeholder={t("apiship.general.fields.token.placeholder")}
                      {...field}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="mode"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.general.fields.mode.label")}
                  </Form.Label>
                  <Form.Control>
                    <Select value={value} onValueChange={onChange} {...field}>
                      <Select.Trigger ref={field.ref}>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="test">
                          {t("statuses.test")}
                        </Select.Item>
                        <Select.Item value="production">
                          {t("statuses.production")}
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  </Form.Control>
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
