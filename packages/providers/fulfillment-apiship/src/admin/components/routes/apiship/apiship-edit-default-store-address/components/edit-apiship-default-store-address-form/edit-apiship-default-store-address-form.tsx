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
import { countries } from "../../../../../../lib/data/countries"

type EditApishipDefaultStoreAddressFormProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onClose: () => void
}

const EditApishipDefaultStoreAddressSchema = z.object({
  country_code: z.string().optional(),
  address_string: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
})

export const EditApishipDefaultStoreAddressForm = ({
  apishipOptions,
  onClose,
}: EditApishipDefaultStoreAddressFormProps) => {
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof EditApishipDefaultStoreAddressSchema>>({
    defaultValues: {
      country_code: apishipOptions?.settings?.default_sender_settings?.country_code
        ? apishipOptions.settings.default_sender_settings.country_code.toLowerCase()
        : undefined,
      address_string:
        apishipOptions?.settings?.default_sender_settings?.address_string ?? "",
      contact_name:
        apishipOptions?.settings?.default_sender_settings?.contact_name ?? "",
      phone: apishipOptions?.settings?.default_sender_settings?.phone ?? "",
    },
    resolver: zodResolver(EditApishipDefaultStoreAddressSchema),
  })

  const { mutateAsync, isPending } = useUpdateApishipOptions()

  useEffect(() => {
    form.reset({
      country_code: apishipOptions?.settings?.default_sender_settings?.country_code
        ? apishipOptions.settings.default_sender_settings.country_code.toLowerCase()
        : undefined,
      address_string:
        apishipOptions?.settings?.default_sender_settings?.address_string ?? "",
      contact_name:
        apishipOptions?.settings?.default_sender_settings?.contact_name ?? "",
      phone: apishipOptions?.settings?.default_sender_settings?.phone ?? "",
    })
  }, [apishipOptions, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        settings: {
          default_sender_settings: {
            ...(values.country_code !== undefined && {
              country_code: values.country_code.toUpperCase(),
            }),
            ...(values.address_string !== undefined && {
              address_string: values.address_string,
            }),
            ...(values.contact_name !== undefined && {
              contact_name: values.contact_name,
            }),
            ...(values.phone !== undefined && {
              phone: values.phone,
            }),
          },
        },
      })

      toast.success(t("apiship.defaultStoreAddress.edit.successToast"))
      onClose()
    } catch (e: any) {
      toast.error(
        e.message ?? t("apiship.defaultStoreAddress.edit.errorToast")
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
              name="country_code"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultStoreAddress.fields.countryCode.label")}
                  </Form.Label>
                  <Form.Control>
                    <Select value={value} onValueChange={onChange} {...field}>
                      <Select.Trigger ref={field.ref}>
                        <Select.Value
                          placeholder={t("apiship.defaultStoreAddress.fields.countryCode.placeholder")}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {countries.map((country) => (
                          <Select.Item
                            key={country.iso_2}
                            value={country.iso_2}
                          >
                            {country.display_name}
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
              name="address_string"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultStoreAddress.fields.address.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder={t("apiship.defaultStoreAddress.fields.address.placeholder")}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultStoreAddress.fields.contactName.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder={t("apiship.defaultStoreAddress.fields.contactName.placeholder")}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="phone"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.defaultStoreAddress.fields.phone.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder={t("apiship.defaultStoreAddress.fields.phone.placeholder")}
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
