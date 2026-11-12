import {
  Container,
  Drawer,
  Button,
  Heading,
  useToggleState,
  Input,
  Label,
} from "@medusajs/ui"
import { Pencil } from "@medusajs/icons"
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { useTranslation } from "react-i18next"
import { SectionRow } from "../../../common/section-row"
import { sdk } from "../../../../lib/sdk"
import { Header } from "../../../common/header"
import type { Feed, FeedResponse } from "../../../../types"

export const ShopSettingsSection = () => {
  const { t } = useTranslation("gorgo")
  const { id } = useParams()
  const [editShopOpen, openEditShop, closeEditShop] = useToggleState()

  const [shopName, setShopName] = useState("")
  const [shopCompany, setShopCompany] = useState("")
  const [shopUrl, setShopUrl] = useState("")

  const { data, isError, error } = useQuery<FeedResponse>({
    queryFn: () => sdk.client.fetch(`/admin/feeds/${id}`),
    queryKey: ["feed", id],
  })
  if (isError) {
    throw error
  }
  useEffect(() => {
    if (data?.feed) {
      setShopName(data.feed.settings?.name!)
      setShopCompany(data.feed.settings?.company!)
      setShopUrl(data.feed.settings?.url!)
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
        queryKey: ["feed", feed?.id],
      })
      queryClient.invalidateQueries({ queryKey: [["feeds"]] })
    },
    onError: (error) => {
      console.error("Error updating feed:", error)
    }
  })

  const saveShopSettings = () => {
    const updatedFeed: Feed = {
      id: feed?.id!,
      settings: {
        name: shopName,
        company: shopCompany,
        url: shopUrl,
        platform: "Medusa"
      }
    }
    updateFeedMutate(updatedFeed)
    closeEditShop()
  }

  return (
    <Container className="divide-y p-0">
      <Header
        key={`${editShopOpen ? "edit-shop-open" : "edit-shop-closed"}`}
        title={t("feedYandex.settings.shop.title")}
        subtitle={t("feedYandex.settings.shop.subtitle")}
        actions={[
          {
            type: "action-menu",
            props: {
              groups: [
                {
                  actions: [
                    {
                      icon: <Pencil />,
                      label: t("feedYandex.actions.edit"),
                      onClick: () => openEditShop(),
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
      <SectionRow title={t("feedYandex.settings.shop.fields.name")} value={feed?.settings?.name || "-"} />
      <SectionRow title={t("feedYandex.settings.shop.fields.company")} value={feed?.settings?.company || "-"} />
      <SectionRow title={t("feedYandex.settings.shop.fields.url")} value={feed?.settings?.url || "-"} />
      <SectionRow title={t("feedYandex.settings.shop.fields.platform")} value="Medusa" />
      <Drawer open={editShopOpen} onOpenChange={(open) => {
        if (!open) closeEditShop()
      }}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title asChild><Heading>{t("feedYandex.feeds.edit.title")}</Heading></Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="shop-name" size="small">{t("feedYandex.settings.shop.fields.name")}</Label>
                <Input id="shop-name" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small" htmlFor="shop-company">{t("feedYandex.settings.shop.fields.company")}</Label>
                <Input id="shop-company" value={shopCompany} onChange={(e) => setShopCompany(e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="shop-url" size="small">{t("feedYandex.settings.shop.fields.url")}</Label>
                <Input id="shop-url" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)} />
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button size="small" variant="secondary">{t("feedYandex.actions.cancel")}</Button>
              </Drawer.Close>
              <Button size="small" type="submit" onClick={saveShopSettings}>{t("feedYandex.actions.save")}</Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}
