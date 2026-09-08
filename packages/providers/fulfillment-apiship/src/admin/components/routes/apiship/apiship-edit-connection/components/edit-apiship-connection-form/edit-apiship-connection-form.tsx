import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Drawer, Select, Switch, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../common/form"
import { KeyboundForm } from "../../../../../utilities/keybound-form"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import {
  useApishipPoints,
  useUpdateApishipConnection,
} from "../../../../../../hooks/api/apiship"
import { useStockLocations } from "../../../../../../hooks/api/stock-locations"
import { Combobox } from "../../../../../common/combobox"
import { translateConnectionError } from "../../../../../../lib/translate-connection-error"

type EditApishipConnectionFormProps = {
  apishipConnection?: ApishipHttpTypes.AdminApishipConnection
  onClose: () => void
  providerId?: string
}

const ANY_STOCK_LOCATION = "__any__"

const EditApishipConnectionSchema = z.object({
  point_in_id: z.string().optional(),
  point_in_address: z.string().optional(),
  stock_location_id: z.string().optional(),
  is_enabled: z.boolean().default(true),
})

export const EditApishipConnectionForm = ({
  apishipConnection,
  onClose,
  providerId,
}: EditApishipConnectionFormProps) => {
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof EditApishipConnectionSchema>>({
    defaultValues: {
      point_in_id: apishipConnection?.point_in_id ?? "",
      point_in_address: apishipConnection?.point_in_address ?? "",
      stock_location_id: apishipConnection?.stock_location_id ?? ANY_STOCK_LOCATION,
      is_enabled: apishipConnection?.is_enabled ?? true,
    },
    resolver: zodResolver(EditApishipConnectionSchema),
  })

  const { mutateAsync, isPending } = useUpdateApishipConnection(
    apishipConnection?.id ?? "",
    providerId
  )
  const { stockLocations } = useStockLocations()

  const providerKey = apishipConnection?.provider_key ?? ""

  const {
    points,
    isLoading: isPointsLoading,
    isError: isPointsError,
    refetch: refetchPoints,
  } = useApishipPoints(providerKey, providerId)

  useEffect(() => {
    if (isPointsError) {
      toast.error(t("apiship.points.loadError"))
    }
  }, [isPointsError, t])

  useEffect(() => {
    form.reset({
      point_in_id: apishipConnection?.point_in_id ?? "",
      point_in_address: apishipConnection?.point_in_address ?? "",
      stock_location_id: apishipConnection?.stock_location_id ?? ANY_STOCK_LOCATION,
      is_enabled: apishipConnection?.is_enabled ?? true,
    })
  }, [apishipConnection, form])

  const pointOptions = useMemo(() => {
    return points.map((point) => ({
      value: String(point.id),
      label: point.address ?? String(point.id),
    }))
  }, [points])

  const stockLocationOptions = useMemo(() => {
    return [
      {
        value: ANY_STOCK_LOCATION,
        label: t("apiship.connections.form.fields.stockLocation.any"),
      },
      ...stockLocations.map((location) => ({
        value: location.id,
        label: location.name,
      })),
    ]
  }, [stockLocations, t])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!apishipConnection) {
      toast.error(
        t("apiship.connections.form.errors.accountConnectionNotFound")
      )
      return
    }

    try {
      await mutateAsync({
        point_in_id: values.point_in_id || undefined,
        point_in_address: values.point_in_id ? values.point_in_address : undefined,
        stock_location_id:
          values.stock_location_id && values.stock_location_id !== ANY_STOCK_LOCATION
            ? values.stock_location_id
            : undefined,
        is_enabled: values.is_enabled,
      })

      toast.success(t("apiship.connections.edit.successToast"))
      onClose()
    } catch (e: any) {
      toast.error(translateConnectionError(e, t, "apiship.connections.edit.errorToast"))
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
              name="stock_location_id"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>
                    {t("apiship.connections.form.fields.stockLocation.label")}
                  </Form.Label>
                  <Form.Hint>
                    {t("apiship.connections.form.fields.stockLocation.hint")}
                  </Form.Hint>
                  <Form.Control>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <Select.Trigger>
                        <Select.Value
                          placeholder={t(
                            "apiship.connections.form.fields.stockLocation.placeholder"
                          )}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {stockLocationOptions.map((option) => (
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
                    <div className="flex items-center gap-x-2">
                      <div className="flex-1">
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
                            isPointsLoading
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
                          disabled={isPointsLoading}
                          allowClear
                        />
                      </div>
                      {isPointsError && (
                        <Button
                          size="small"
                          variant="secondary"
                          type="button"
                          onClick={() => refetchPoints()}
                        >
                          {t("apiship.points.retry")}
                        </Button>
                      )}
                    </div>
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
