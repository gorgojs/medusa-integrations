import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Drawer, Select, Switch, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../common/form"
import { KeyboundForm } from "../../../../../utilities/keybound-form"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { useUpdateApishipOptions } from "../../../../../../hooks/api/apiship"

type EditApishipPaymentAndTaxFormProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onClose: () => void
}

const VAT_OPTIONS = [
  { value: "-1", labelKey: "apiship.paymentAndTax.values.noVat" },
  { value: "0", labelKey: "apiship.paymentAndTax.values.vat0" },
  { value: "5", labelKey: "apiship.paymentAndTax.values.vat5" },
  { value: "7", labelKey: "apiship.paymentAndTax.values.vat7" },
  { value: "10", labelKey: "apiship.paymentAndTax.values.vat10" },
  { value: "20", labelKey: "apiship.paymentAndTax.values.vat20" },
  { value: "22", labelKey: "apiship.paymentAndTax.values.vat22" },
] as const

type VatSelectValue = (typeof VAT_OPTIONS)[number]["value"]

const EditApishipPaymentAndTaxSchema = z.object({
  is_cod: z.boolean().optional(),
  delivery_cost_vat: z
    .enum(["-1", "0", "5", "7", "10", "20", "22"])
    .optional(),
})

function toVatSelectValue(
  value?: ApishipHttpTypes.AdminCostDeliveryCostVatEnum | null
): VatSelectValue | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  return String(value) as VatSelectValue
}

function toVatEnum(
  value?: VatSelectValue
): ApishipHttpTypes.AdminCostDeliveryCostVatEnum | undefined {
  if (value === undefined) {
    return undefined
  }

  return Number(value) as ApishipHttpTypes.AdminCostDeliveryCostVatEnum
}

export const EditApishipPaymentAndTaxForm = ({
  apishipOptions,
  onClose,
}: EditApishipPaymentAndTaxFormProps) => {
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof EditApishipPaymentAndTaxSchema>>({
    defaultValues: {
      is_cod: apishipOptions?.settings?.is_cod,
      delivery_cost_vat: toVatSelectValue(
        apishipOptions?.settings?.delivery_cost_vat
      ),
    },
    resolver: zodResolver(EditApishipPaymentAndTaxSchema),
  })

  const { mutateAsync, isPending } = useUpdateApishipOptions()

  useEffect(() => {
    form.reset({
      is_cod: apishipOptions?.settings?.is_cod,
      delivery_cost_vat: toVatSelectValue(
        apishipOptions?.settings?.delivery_cost_vat
      ),
    })
  }, [apishipOptions, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        settings: {
          ...(values.is_cod !== undefined && {
            is_cod: values.is_cod,
          }),
          ...(values.delivery_cost_vat !== undefined && {
            delivery_cost_vat: toVatEnum(values.delivery_cost_vat),
          }),
        },
      })

      toast.success(t("apiship.paymentAndTax.edit.successToast"))
      onClose()
    } catch (e: any) {
      toast.error(
        e.message ?? t("apiship.paymentAndTax.edit.errorToast")
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
              name="delivery_cost_vat"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.paymentAndTax.fields.deliveryCostVat.label")}
                  </Form.Label>
                  <Form.Control>
                    <Select value={value} onValueChange={onChange} {...field}>
                      <Select.Trigger ref={field.ref}>
                        <Select.Value
                          placeholder={t(
                            "apiship.paymentAndTax.fields.deliveryCostVat.placeholder"
                          )}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {VAT_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {t(option.labelKey)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="is_cod"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <div className="flex items-start justify-between">
                    <Form.Label>
                      {t("apiship.paymentAndTax.fields.isCod.label")}
                    </Form.Label>
                    <Form.Control>
                      <Switch
                        {...field}
                        checked={!!value}
                        onCheckedChange={onChange}
                      />
                    </Form.Control>
                  </div>
                  <Form.Hint>
                    {t("apiship.paymentAndTax.fields.isCod.hint")}
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
