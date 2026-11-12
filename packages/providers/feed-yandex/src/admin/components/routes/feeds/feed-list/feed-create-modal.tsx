import {
  Container,
  FocusModal,
  Button,
  Heading,
  Text,
  Input,
  Label,
  Select,
  Tooltip,
  Switch,
} from "@medusajs/ui"
import { InformationCircleSolid } from "@medusajs/icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { useTranslation } from "react-i18next"
import { sdk } from "../../../../lib/sdk"
import { scheduleIntervals, fileExtension } from "../../../../lib/constants"
import type { Feed } from "../../../../types"
import { getScheduleLabel } from "../../../../lib/utils"

export const FeedCreateModal = ({
  stateModal,
  closeModal
}: {
  stateModal: boolean,
  closeModal: () => void
}) => {
  const { t } = useTranslation("gorgo")
  const [title, setTitle] = useState("")
  const [fileName, setFileName] = useState("")
  const [schedule, setSchedule] = useState<number>(scheduleIntervals[1])
  const [isActive, setIsActive] = useState(false)

  const queryClient = useQueryClient()

  const { mutate } = useMutation({
    mutationFn: async (newFeed: { feeds: Partial<Feed>[] }) => {
      return sdk.client.fetch(`/admin/feeds`, {
        method: "POST",
        body: newFeed,
        headers: {
          "Content-Type": "application/json",
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [["feeds"]],
      })
      setTitle("")
      setFileName("")
      setSchedule(scheduleIntervals[1])
      setIsActive(false)
    },
    onError: (error) => {
      console.error("Error creating feed:", error)
    },
  })

  const saveFeed = () => {
    const newFeed: Partial<Feed>[] = [{
      title: title,
      file_name: fileName,
      is_active: isActive,
      schedule: Number(schedule),
    }]
    mutate({ feeds: newFeed })
    closeModal()
  }

  // TODO: rewrite this to use a form library
  // to handle validation and submission more effectively
  return (
    <FocusModal open={stateModal} onOpenChange={(open) => { if (!open) closeModal() }}>
      <FocusModal.Content>
        <FocusModal.Header />

        <FocusModal.Body className="flex flex-col items-center py-16">
          <div className="flex w-full max-w-lg flex-col gap-y-8">
            <div className="flex flex-col gap-y-1">
              <Heading>{t("feedYandex.feeds.create.title")}</Heading>
              <Text className="text-ui-fg-subtle">
                {t("feedYandex.feeds.create.description")}
              </Text>
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="title" size="small">{t("feedYandex.feeds.fields.title")}</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="file_name" size="small">{t("feedYandex.feeds.fields.fileName")}</Label>
              <div className="relative">
                <Input id="file_name" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                <div className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center border-l">
                  <p className="font-medium font-sans txt-compact-small text-ui-fg-muted">
                    {fileExtension}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="schedule_selector" size="small">{t("feedYandex.feeds.fields.schedule")}</Label>
                <Tooltip content={t("feedYandex.feeds.tooltips.schedule")}>
                  <InformationCircleSolid className="text-ui-fg-subtle" />
                </Tooltip>
              </div>
              <Select onValueChange={(v) => setSchedule(Number(v))} value={String(schedule)}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content sideOffset={100}>
                  {scheduleIntervals.map((value) => (
                    <Select.Item key={value} value={String(value)}>
                      {getScheduleLabel(value, t)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="is-active-switch" size="small">{t("feedYandex.feeds.activityContainer.title")}</Label>
              <Container>
                <div className="flex gap-x-4">
                  <Switch id="is-active-switch" checked={isActive} onCheckedChange={() => setIsActive(prev => !prev)} />
                  <div className="flex flex-col gap-y-1">
                    <Label size="small" htmlFor="is-active-switch">{t("feedYandex.general.active")}</Label>
                    <Text size="small" className="text-ui-fg-muted">
                      {t("feedYandex.feeds.activityContainer.subtitle")}
                    </Text>
                  </div>
                </div>
              </Container>
            </div>
          </div>
        </FocusModal.Body>

        <FocusModal.Footer>
          <FocusModal.Close>
            <Button variant="secondary">{t("feedYandex.actions.cancel")}</Button>
          </FocusModal.Close>
          <Button onClick={saveFeed}>{t("feedYandex.actions.save")}</Button>
        </FocusModal.Footer>

      </FocusModal.Content>
    </FocusModal>
  )
}
