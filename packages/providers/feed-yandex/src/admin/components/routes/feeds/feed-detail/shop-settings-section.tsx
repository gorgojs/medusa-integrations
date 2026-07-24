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

import { i18n } from "../../../../components/utilities/i18n"
import { SectionRow } from "../../../common/section-row"
import { sdk } from "../../../../lib/sdk"
import { Header } from "../../../common/header"
import type { Feed, FeedResponse } from "../../../../types"

export const ShopSettingsSection = () => {
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
        title={i18n.t("settings.shop.title")}
        subtitle={i18n.t("settings.shop.subtitle")}
        actions={[
          {
            type: "action-menu",
            props: {
              groups: [
                {
                  actions: [
                    {
                      icon: <Pencil />,
                      label: i18n.t("actions.edit"),
                      onClick: () => openEditShop(),
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
      <SectionRow title={i18n.t("settings.shop.fields.name")} value={feed?.settings?.name || "-"} />
      <SectionRow title={i18n.t("settings.shop.fields.company")} value={feed?.settings?.company || "-"} />
      <SectionRow title={i18n.t("settings.shop.fields.url")} value={feed?.settings?.url || "-"} />
      <SectionRow title={i18n.t("settings.shop.fields.platform")} value="Medusa" />
      <Drawer open={editShopOpen} onOpenChange={(open) => {
        if (!open) closeEditShop()
      }}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title asChild><Heading>{i18n.t("feeds.edit.title")}</Heading></Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="shop-name" size="small">{i18n.t("settings.shop.fields.name")}</Label>
                <Input id="shop-name" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small" htmlFor="shop-company">{i18n.t("settings.shop.fields.company")}</Label>
                <Input id="shop-company" value={shopCompany} onChange={(e) => setShopCompany(e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="shop-url" size="small">{i18n.t("settings.shop.fields.url")}</Label>
                <Input id="shop-url" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)} />
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button size="small" variant="secondary">{i18n.t("actions.cancel")}</Button>
              </Drawer.Close>
              <Button size="small" type="submit" onClick={saveShopSettings}>{i18n.t("actions.save")}</Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}
