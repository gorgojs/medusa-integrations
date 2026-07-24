import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  Heading,
  FocusModal,
  Switch,
  Text,
  toast,
  Select,
  InlineTip
} from "@medusajs/ui"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../common/form"
import { KeyboundForm } from "../../../../../utilities/keybound-form"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import {
  useApishipPoints,
  useCreateApishipConnection,
} from "../../../../../../hooks/api/apiship"
import { Combobox } from "../../../../../common/combobox"

type ApishipConnectionCreateFormProps = {
  onClose: () => void
  accountConnections: ApishipHttpTypes.AdminApishipAccountConnection[]
  providers: ApishipHttpTypes.AdminApishipProvider[]
}

const ApishipConnectionCreateSchema = z.object({
  account_connection_id: z.string().min(1, "Connection is required"),
  point_in_id: z.string().optional(),
  point_in_address: z.string().optional(),
  is_enabled: z.boolean().default(true),
})

export const ApishipConnectionCreateForm = ({
  onClose,
  accountConnections,
  providers,
}: ApishipConnectionCreateFormProps) => {
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof ApishipConnectionCreateSchema>>({
    defaultValues: {
      account_connection_id: "",
      point_in_id: "",
      point_in_address: "",
      is_enabled: true,
    },
    resolver: zodResolver(ApishipConnectionCreateSchema),
  })

  const { mutateAsync, isPending } = useCreateApishipConnection()

  const [hasRequestedPoints, setHasRequestedPoints] = useState(false)

  const selectedAccountConnectionId = useWatch({
    control: form.control,
    name: "account_connection_id",
  })

  const selectedAccountConnection = useMemo(() => {
    return accountConnections.find(
      (connection) => connection.id === selectedAccountConnectionId
    )
  }, [accountConnections, selectedAccountConnectionId])

  const selectedProviderKey = selectedAccountConnection?.provider_key ?? ""

  const { points, isLoading: isPointsLoading } = useApishipPoints(
    selectedProviderKey
  )

  useEffect(() => {
    form.setValue("point_in_id", "")
    form.setValue("point_in_address", "")
    setHasRequestedPoints(false)
  }, [selectedAccountConnectionId, form])

  const accountConnectionOptions = useMemo(() => {
    return accountConnections.map((connection) => {
      const providerName =
        providers.find((provider) => provider.key === connection.provider_key)
          ?.name ?? connection.provider_key

      return {
        value: connection.id,
        label: connection.name ? `${providerName} — ${connection.name}` : providerName,
      }
    })
  }, [accountConnections, providers])

  const pointOptions = useMemo(() => {
    return points.map((point) => ({
      value: String(point.id),
      label: point.address ?? String(point.id),
    }))
  }, [points])

  const handleLoadPoints = () => {
    if (!selectedProviderKey) {
      toast.error(
        t("apiship.connections.form.errors.selectAccountConnectionFirst")
      )
      return
    }

    form.setValue("point_in_id", "")
    form.setValue("point_in_address", "")
    setHasRequestedPoints(true)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const accountConnection = accountConnections.find(
        (connection) => connection.id === values.account_connection_id
      )

      if (!accountConnection) {
        toast.error(
          t("apiship.connections.form.errors.accountConnectionNotFound")
        )
        return
      }

      await mutateAsync({
        name: accountConnection.name,
        provider_key: accountConnection.provider_key,
        provider_connect_id: accountConnection.id,
        ...(values.point_in_id
          ? {
              point_in_id: values.point_in_id,
              point_in_address: values.point_in_address,
            }
          : {}),
        is_enabled: values.is_enabled,
      })

      toast.success(t("apiship.connections.create.successToast"))
      form.reset()
      setHasRequestedPoints(false)
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? t("apiship.connections.create.errorToast"))
    }
  })

  return (
    <Form {...form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex h-full flex-1 flex-col overflow-hidden"
      >
        <FocusModal.Body className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
            <div>
              <Heading>
                {t("apiship.connections.create.header")}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {t("apiship.connections.create.description")}
              </Text>
            </div>

            <Form.Field
              control={form.control}
              name="account_connection_id"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("apiship.connections.form.fields.accountConnection.label")}
                  </Form.Label>
                  <Form.Control>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <Select.Trigger>
                        <Select.Value
                          placeholder={t(
                            "apiship.connections.form.fields.accountConnection.placeholder"
                          )}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {accountConnectionOptions.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
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
              name="point_in_id"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>
                    {t("apiship.connections.form.fields.point.label")}
                  </Form.Label>
                  <Form.Hint>
                    {t("apiship.connections.form.fields.point.hint")}
                  </Form.Hint>
                  <Form.Control>
                    <Combobox
                      value={field.value}
                      limit={20}
                      onChange={(value) => {
                        field.onChange(value)

                        if (!value) {
                          form.setValue("point_in_address", "")
                          return
                        }

                        const selectedPoint = points.find(
                          (point) => String(point.id) === value
                        )

                        form.setValue(
                          "point_in_address",
                          selectedPoint?.address ?? ""
                        )
                      }}
                      options={pointOptions}
                      placeholder={
                        !selectedProviderKey
                          ? t(
                              "apiship.connections.form.fields.point.placeholderSelectAccountConnection"
                            )
                          : isPointsLoading
                            ? t(
                                "apiship.connections.form.fields.point.placeholderLoading"
                              )
                            : pointOptions.length
                              ? t(
                                  "apiship.connections.form.fields.point.placeholder"
                                )
                              : t(
                                  "apiship.connections.form.fields.point.noResults"
                                )
                      }
                      disabled={!selectedProviderKey || isPointsLoading}
                      allowClear
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            
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

            <InlineTip label={t("general.tip")}>
              {t("apiship.connections.form.hints.singleEnabledPerProvider")}
            </InlineTip>
          </div>
        </FocusModal.Body>

        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </FocusModal.Close>

            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </FocusModal.Footer>
      </KeyboundForm>
    </Form>
  )
}
