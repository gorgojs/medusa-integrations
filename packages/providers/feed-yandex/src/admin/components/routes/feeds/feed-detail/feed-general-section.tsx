import {
  Container,
  Text,
  Drawer,
  Button,
  Heading,
  useToggleState,
  Input,
  Label,
  Switch,
  Select,
  Prompt,
  Badge,
  toast,
  Tooltip
} from "@medusajs/ui"
import { Pencil, Trash, Folder } from "@medusajs/icons"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { useTranslation } from "react-i18next"
import { SectionRow } from "../../../common/section-row"
import { sdk } from "../../../../lib/sdk"
import { Header } from "../../../common/header"
import { scheduleIntervals, fileExtension } from "../../../../lib/constants"
import type { Feed, FeedResponse } from "../../../../types"
import { getScheduleLabel } from "../../../../lib/utils"
import { useDate } from "../../../../hooks/use-date"

export const FeedGeneralSection = () => {
  const { t } = useTranslation("gorgo")
  const { id } = useParams()
  const navigate = useNavigate()

  const [deleteFeedOpen, openDeleteFeed, closeDeleteFeed] = useToggleState()
  const [deleteFeedFileOpen, openDeleteFeedFile, closeDeleteFeedFile] = useToggleState()
  const [editOpen, openEdit, closeEdit] = useToggleState()

  const [title, setTitle] = useState("")
  const [fileName, setFileName] = useState("")
  const [schedule, setSchedule] = useState<string>()
  const [isActive, setIsActive] = useState(true)

  const { getFullDate, getRelativeDate } = useDate()

  const { data, isError, error } = useQuery<FeedResponse>({
    queryFn: () => sdk.client.fetch(`/admin/feeds/${id}`),
    queryKey: ["feed", id],
  })
  if (isError) {
    throw error
  }
  useEffect(() => {
    if (data?.feed) {
      setTitle(data.feed.title!)
      setFileName(data.feed.file_name!)
      setIsActive(data.feed.is_active!)
      setSchedule(String(data.feed.schedule))
    }
  }, [data])
  const feed = data?.feed

  const queryClient = useQueryClient()
  const { mutate: updateFeedMutate } = useMutation({
    mutationFn: async (updatedFeed: Feed) => {
      return sdk.client.fetch(`/admin/feeds/${updatedFeed.id}`, {
        method: "PATCH",
        body: updatedFeed,
        headers: {
          "Content-Type": "application/json",
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["feed", id],
      })
      queryClient.invalidateQueries({ queryKey: [["feeds"]] })
    },
    onError: (error) => {
      console.error("Error updating feed:", error)
    }
  })

  const { mutate: deleteFeedMutate } = useMutation({
    mutationFn: async (feedId: { ids: string[] }) => {
      return sdk.client.fetch(`/admin/feeds/${feedId.ids[0]}`, {
        method: "DELETE",
        body: feedId,
        headers: {
          "Content-Type": "application/json",
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["feed", id],
      })
      queryClient.invalidateQueries({ queryKey: [["feeds"]] })
    },
    onError: (error) => {
      console.error("Error deleting feed:", error)
    }
  })

  const { mutate: deleteFeedFileMutate } = useMutation({
    mutationFn: async (feedId: string) => {
      return sdk.client.fetch(`/admin/feeds/${feedId}/delete-file`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["feed", id],
      })
      queryClient.invalidateQueries({ queryKey: [["feeds"]] })
    },
    onError: (error) => {
      console.error("Error deleting file:", error)
    }
  })

  const { mutate: launchFeedMutate } = useMutation({
    mutationFn: async (feedId: string) => {
      return sdk.client.fetch(`/admin/feeds/${feedId}/launch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["feed", id],
      })
      queryClient.invalidateQueries({ queryKey: [["feeds"]] })
      toast.success(t("feedYandex.general.success"), {
        description: t("feedYandex.feeds.toasts.exportLaunched"),
      })
    },
    onError: (error) => {
      console.error("Error launching feed:", error)
    }
  })

  const saveFeedSettings = () => {
    const updatedFeed: Feed = {
      id: id!,
      title: title,
      file_name: fileName,
      is_active: isActive,
      schedule: Number(schedule)
    }
    updateFeedMutate(updatedFeed)
    closeEdit()
  }

  const deleteFeed = () => {
    const deletedFeed = {
      ids: [id!]
    }
    deleteFeedMutate(deletedFeed)
    navigate(`../`)
  }

  const deleteFeedFile = () => {
    deleteFeedFileMutate(id!)
    closeDeleteFeedFile()
  }

  const launchFeed = async () => {
    await launchFeedMutate(id!)
  }

  return (
    <Container className="divide-y p-0">
      <Header
        key={`${editOpen ? "edit-open" : "edit-closed"}-${deleteFeedOpen ? "delete-feed-open" : "delete-feed-closed"}-${deleteFeedFileOpen ? "delete-feed-file-open" : "delete-feed-file-closed"}`}

        title={feed?.title!}
        status={{
          color: feed?.is_active ? "green" : "red",
          text: feed?.is_active ? t("feedYandex.general.active") : t("feedYandex.general.inactive")
        }}
        actions={[
          {
            type: "button",
            props: {
              children: t("feedYandex.actions.launchNow"),
              variant: "secondary",
              onClick: () => {
                launchFeed()
              },
            },
          },
          {
            type: "action-menu",
            props: {
              groups: [
                {
                  actions: [
                    {
                      icon: <Pencil />,
                      label: t("feedYandex.actions.edit"),
                      onClick: () => openEdit(),
                    },
                    {
                      icon: <Folder />,
                      label: t("feedYandex.actions.deleteFile"),
                      onClick: () => openDeleteFeedFile(),
                    },
                    {
                      icon: <Trash />,
                      label: t("feedYandex.actions.delete"),
                      onClick: () => openDeleteFeed(),
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.id")}
        value={feed?.id || "-"}
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.fileName")}
        value={feed?.file_name + fileExtension || "-"}
        className="break-all"
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.feedUrl")}
        value={
          feed?.file_path && feed?.id && feed?.file_name
          ? (
            (() => {
              const feedViewUrl = `${window.location.origin}/feeds/${feed.id}/${feed.file_name}${fileExtension}`
              return (
                <a href={feedViewUrl} target="_blank" rel="noopener noreferrer">
                  <Badge size="base" className="h-full">
                    <Text size="xsmall" className="text-ui-fg-interactive break-all">{feedViewUrl}</Text>
                  </Badge>
                </a>
              )
            })()
          )
          : ""
        }
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.filePath")}
        value={
          feed?.file_path
            ? (
              <a href={feed.file_path} target="_blank" rel="noopener noreferrer">
                <Badge size="base" className="h-full">
                  <Text size="xsmall" className="text-ui-fg-interactive break-all">{feed.file_path}</Text>
                </Badge>
              </a>
            )
            : ""
        }
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.schedule")}
        value={
          feed?.schedule
            ? (() => {
              const interval = scheduleIntervals.find(
                (value) => value === feed.schedule
              )
              return (
                <Badge size="2xsmall">
                  <Text size="small" leading="compact">
                    {getScheduleLabel(interval || feed.schedule, t)}
                  </Text>
                </Badge>
              )
            })()
            : ""
        }
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.lastExport")}
        value={
          feed?.last_export_at
            ? (
              <Tooltip
                className="z-10"
                content={
                  <span className="text-pretty">{`${getFullDate({
                    date: feed.last_export_at,
                    includeTime: true,
                  })}`}</span>
                }
              >
                <Text
                  size="small"
                  leading="compact"
                  className="whitespace-pre-line text-pretty"
                >
                  {getRelativeDate(feed.last_export_at)}
                </Text>
              </Tooltip>
            )
            : ""
        }
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.created")}
        value={
          feed?.created_at
            ? getFullDate({
              date: feed.created_at,
              includeTime: true,
            })
            : ""
        }
      />
      <SectionRow
        title={t("feedYandex.feeds.fields.updated")}
        value={
          feed?.updated_at
            ? getFullDate({
              date: feed.updated_at,
              includeTime: true,
            })
            : ""
        }
      />
      <Drawer open={editOpen} onOpenChange={(open) => {
        if (!open) closeEdit()
      }}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title asChild><Heading>{t("feedYandex.feeds.edit.title")}</Heading></Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <div className="flex flex-col gap-y-4">
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
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="title" size="small">{t("feedYandex.feeds.fields.title")}</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small" htmlFor="feed-file-name-input">{t("feedYandex.feeds.fields.fileName")}</Label>
                <div className="relative">
                  <Input className="pr-14" id="feed-file-name-input" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                  <div className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center border-l">
                    <p className="font-medium font-sans txt-compact-small text-ui-fg-muted">
                      {fileExtension}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small" htmlFor="schedule-selector">{t("feedYandex.feeds.fields.schedule")}</Label>
                <Select value={schedule} onValueChange={setSchedule}>
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

            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button size="small" variant="secondary">{t("feedYandex.actions.cancel")}</Button>
              </Drawer.Close>
              <Button size="small" type="submit" onClick={saveFeedSettings}>{t("feedYandex.actions.save")}</Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
      <Prompt open={deleteFeedOpen} onOpenChange={(open) => {
        if (!open) closeDeleteFeed()
      }}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("feedYandex.feeds.prompts.deleteFeed.title")}</Prompt.Title>
            <Prompt.Description>
              {t("feedYandex.feeds.prompts.deleteFeed.description")}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>{t("feedYandex.actions.cancel")}</Prompt.Cancel>
            <Prompt.Action onClick={() => deleteFeed()}>{t("feedYandex.actions.delete")}</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
      <Prompt open={deleteFeedFileOpen} onOpenChange={(open) => {
        if (!open) closeDeleteFeedFile()
      }}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("feedYandex.feeds.prompts.deleteFeedFile.title")}</Prompt.Title>
            <Prompt.Description>
              {t("feedYandex.feeds.prompts.deleteFeedFile.description")}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>{t("feedYandex.actions.cancel")}</Prompt.Cancel>
            <Prompt.Action onClick={() => deleteFeedFile()}>{t("feedYandex.actions.delete")}</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}
