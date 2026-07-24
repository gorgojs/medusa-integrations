import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Drawer, Input, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../common/form"
import { KeyboundForm } from "../../../../../utilities/keybound-form"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { useUpdateApishipOptions } from "../../../../../../hooks/api/apiship"

type EditApishipDefaultProductSizesFormProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onClose: () => void
}

const numberField = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined
    }

    return Number(value)
  },
  z.number().min(0).optional()
)

const EditApishipDefaultProductSizesSchema = z.object({
  length: numberField,
  width: numberField,
  height: numberField,
  weight: numberField,
})

export const EditApishipDefaultProductSizesForm = ({
  apishipOptions,
  onClose,
}: EditApishipDefaultProductSizesFormProps) => {
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof EditApishipDefaultProductSizesSchema>>({
    defaultValues: {
      length: apishipOptions?.settings?.default_product_sizes?.length,
      width: apishipOptions?.settings?.default_product_sizes?.width,
      height: apishipOptions?.settings?.default_product_sizes?.height,
      weight: apishipOptions?.settings?.default_product_sizes?.weight,
    },
    resolver: zodResolver(EditApishipDefaultProductSizesSchema),
  })

  const { mutateAsync, isPending } = useUpdateApishipOptions()

  useEffect(() => {
    form.reset({
      length: apishipOptions?.settings?.default_product_sizes?.length,
      width: apishipOptions?.settings?.default_product_sizes?.width,
      height: apishipOptions?.settings?.default_product_sizes?.height,
      weight: apishipOptions?.settings?.default_product_sizes?.weight,
    })
  }, [apishipOptions, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        settings: {
          default_product_sizes: {
            ...(values.length !== undefined && { length: values.length }),
            ...(values.width !== undefined && { width: values.width }),
            ...(values.height !== undefined && { height: values.height }),
            ...(values.weight !== undefined && { weight: values.weight }),
          },
        },
      })

      toast.success(t("apiship.defaultProductSizes.edit.successToast"))
      onClose()
    } catch (e: any) {
      toast.error(
        e.message ?? t("apiship.defaultProductSizes.edit.errorToast")
      )
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
              name="length"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultProductSizes.fields.length.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="width"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultProductSizes.fields.width.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="height"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultProductSizes.fields.height.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="weight"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultProductSizes.fields.weight.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                    />
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
