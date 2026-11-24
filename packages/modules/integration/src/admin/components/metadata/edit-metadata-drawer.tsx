import { ArrowDownMini, ArrowUpMini, EllipsisVertical, Trash } from "@medusajs/icons"
import { Button, Drawer, DropdownMenu, Heading, IconButton, InlineTip, clx, toast } from "@medusajs/ui"
import { ConditionalTooltip, Form, KeyboundForm } from "@medusajs/dashboard/components"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { forwardRef, useState, type ComponentPropsWithoutRef } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { sdk } from "../../lib/sdk"
import { hasUneditableRows, metadataRows, parseMetadataRows, type Metadata, type MetadataRow } from "../../lib/metadata"

const KEY_LABEL_ID = "integration-metadata-key-label"
const VALUE_LABEL_ID = "integration-metadata-value-label"

const blankRow = (): MetadataRow => ({ key: "", value: "", disabled: false })

/** Medusa's metadata editor in a drawer. Objects, arrays and null are shown read-only. */
export const EditMetadataDrawer = ({
  open,
  onOpenChange,
  providerId,
  metadata,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  metadata: Metadata
}) => {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  // Read once on open, so a background refetch doesn't reset the form.
  const [original] = useState(() => metadata ?? null)
  const form = useForm<{ metadata: MetadataRow[] }>({ defaultValues: { metadata: metadataRows(original) } })
  const { fields, insert, remove } = useFieldArray({ control: form.control, name: "metadata" })
  const direction = i18n.dir()

  const save = useMutation({
    mutationFn: (next: Record<string, unknown> | null) =>
      sdk.client.fetch(`/admin/integrations/${providerId}`, { method: "POST", body: { metadata: next } }),
    onSuccess: () => {
      toast.success(t("metadata.edit.successToast"))
      qc.invalidateQueries({ queryKey: ["integration", providerId] })
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  const handleSubmit = form.handleSubmit((data) => save.mutate(parseMetadataRows(data.metadata, original)))

  const deleteRow = (index: number) => {
    remove(index)
    // The form always keeps one row to type into.
    if (fields.length === 1) insert(0, blankRow())
  }
  const insertRow = (index: number, position: "above" | "below") =>
    insert(index + (position === "above" ? 0 : 1), blankRow())

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>{t("metadata.edit.header")}</Heading>
          </Drawer.Title>
          <Drawer.Description className="sr-only">{t("metadata.edit.description")}</Drawer.Description>
        </Drawer.Header>
        <Form {...form}>
          <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <Drawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
              <div className="bg-ui-bg-base shadow-elevation-card-rest grid grid-cols-1 divide-y rounded-lg">
                <div className="bg-ui-bg-subtle grid grid-cols-2 divide-x rounded-t-lg">
                  <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
                    <label id={KEY_LABEL_ID}>{t("metadata.edit.labels.key")}</label>
                  </div>
                  <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
                    <label id={VALUE_LABEL_ID}>{t("metadata.edit.labels.value")}</label>
                  </div>
                </div>
                {fields.map((field, index) => {
                  const isDisabled = field.disabled || false
                  const placeholder = Array.isArray(field.value)
                    ? "[ ... ]"
                    : typeof field.value === "object"
                      ? "{ ... }"
                      : "-"
                  return (
                    <ConditionalTooltip
                      key={field.id}
                      showTooltip={isDisabled}
                      content={t("metadata.edit.complexRow.tooltip")}
                    >
                      <div className="group/table relative">
                        <div
                          className={clx("grid grid-cols-2 divide-x", {
                            "overflow-hidden rounded-b-lg": index === fields.length - 1,
                          })}
                        >
                          <Form.Field
                            control={form.control}
                            name={`metadata.${index}.key`}
                            render={({ field: input }) => (
                              <Form.Item>
                                <Form.Control>
                                  <GridInput
                                    aria-labelledby={KEY_LABEL_ID}
                                    {...input}
                                    disabled={isDisabled}
                                    placeholder="Key"
                                  />
                                </Form.Control>
                              </Form.Item>
                            )}
                          />
                          <Form.Field
                            control={form.control}
                            name={`metadata.${index}.value`}
                            render={({ field: { value, ...input } }) => (
                              <Form.Item>
                                <Form.Control>
                                  <GridInput
                                    aria-labelledby={VALUE_LABEL_ID}
                                    {...input}
                                    value={isDisabled ? placeholder : (value as string)}
                                    disabled={isDisabled}
                                    placeholder="Value"
                                  />
                                </Form.Control>
                              </Form.Item>
                            )}
                          />
                        </div>
                        <DropdownMenu dir={direction}>
                          <DropdownMenu.Trigger
                            className={clx(
                              "invisible absolute inset-y-0 -end-2.5 my-auto group-hover/table:visible data-[state='open']:visible",
                              { hidden: isDisabled }
                            )}
                            disabled={isDisabled}
                            asChild
                          >
                            <IconButton size="2xsmall">
                              <EllipsisVertical />
                            </IconButton>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content>
                            <DropdownMenu.Item className="gap-x-2" onClick={() => insertRow(index, "above")}>
                              <ArrowUpMini className="text-ui-fg-subtle" />
                              {t("metadata.edit.actions.insertRowAbove")}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className="gap-x-2" onClick={() => insertRow(index, "below")}>
                              <ArrowDownMini className="text-ui-fg-subtle" />
                              {t("metadata.edit.actions.insertRowBelow")}
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item className="gap-x-2" onClick={() => deleteRow(index)}>
                              <Trash className="text-ui-fg-subtle" />
                              {t("metadata.edit.actions.deleteRow")}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      </div>
                    </ConditionalTooltip>
                  )
                })}
              </div>
              {hasUneditableRows(original) && (
                <InlineTip variant="warning" label={t("metadata.edit.complexRow.label")}>
                  {t("metadata.edit.complexRow.description")}
                </InlineTip>
              )}
            </Drawer.Body>
            <Drawer.Footer>
              <div className="flex w-full items-center justify-between">
                <Button size="small" variant="secondary" type="button" onClick={() => insert(fields.length, blankRow())}>
                  {t("metadata.edit.actions.addRow")}
                </Button>
                <div className="flex items-center gap-x-2">
                  <Drawer.Close asChild>
                    <Button size="small" variant="secondary" type="button" disabled={save.isPending}>
                      {t("actions.cancel")}
                    </Button>
                  </Drawer.Close>
                  <Button size="small" type="submit" isLoading={save.isPending}>
                    {t("actions.save")}
                  </Button>
                </div>
              </div>
            </Drawer.Footer>
          </KeyboundForm>
        </Form>
      </Drawer.Content>
    </Drawer>
  )
}

const GridInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    autoComplete="off"
    className={clx(
      "txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted disabled:text-ui-fg-disabled disabled:bg-ui-bg-base bg-transparent px-2 py-1.5 outline-none",
      className
    )}
  />
))
GridInput.displayName = "EditMetadataDrawer.GridInput"
