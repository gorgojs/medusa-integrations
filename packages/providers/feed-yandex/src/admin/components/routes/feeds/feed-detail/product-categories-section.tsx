import {
  Container,
  DataTable,
  createDataTableColumnHelper,
  useDataTable,
  Text,
  DataTableRowSelectionState,
  toast,
} from "@medusajs/ui"
import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query"
import { useState, useMemo, useEffect } from "react"
import { useParams } from "react-router-dom"

import { i18n } from "../../../../components/utilities/i18n"
import { sdk } from "../../../../lib/sdk"
import { Header } from "../../../common/header"
import { Feed, FeedResponse } from "../../../../types"

type Category = {
  id: string
  name: string
  description: string
  rank: number | null
  parent_category_id: string | null
}

type CategorySetting = {
  id: string
  parentId?: string
  value: string
}

type CategoryWithChildren = Category & { children: CategoryWithChildren[] }

function buildCategoryTree(categories: Category[]): CategoryWithChildren[] {
  const map = new Map<string, CategoryWithChildren>()
  const roots: CategoryWithChildren[] = []

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] })
  })

  categories.forEach((cat) => {
    const node = map.get(cat.id)!
    if (cat.parent_category_id && map.has(cat.parent_category_id)) {
      map.get(cat.parent_category_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function flattenCategoryTree(tree: CategoryWithChildren[], level = 0): Category[] {
  const result: Category[] = []

  for (const node of tree) {
    result.push({
      ...node,
      name: `${"  ".repeat(level)}${node.name}`,
    })

    if (node.children.length) {
      result.push(...flattenCategoryTree(node.children, level + 1))
    }
  }

  return result
}

export const ProductCategoriesSection = () => {
  const { id } = useParams()
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})

  const { data: feedData, isError, error } = useQuery<FeedResponse>({
    queryFn: () => sdk.client.fetch(`/admin/feeds/${id}`),
    queryKey: ["feed", id],
  })
  if (isError) {
    throw error
  }
  const feed = feedData?.feed
  const selectedIds: string[] =
    feed?.settings?.categories?.map((c) => c.id) ?? []

  const columnHelper = createDataTableColumnHelper<Category>()
  const columns = [
    columnHelper.select(),
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ getValue }) => <Text className="whitespace-pre h-12 flex items-center">{getValue()}</Text>,
    }),
  ]

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { product_categories } = await sdk.admin.productCategory.list({
        is_active: true,
        fields: "id,name,rank,parent_category_id",
      })
      const tree = buildCategoryTree(product_categories)
      return flattenCategoryTree(tree)
    },
  })

  useEffect(() => {
    if (categoriesData && selectedIds.length > 0) {
      setRowSelection(
        Object.fromEntries(selectedIds.map((id) => [id, true]))
      )
    }
  }, [categoriesData, feedData])

  const isModified = useMemo(() => {
    return JSON.stringify(rowSelection) !== JSON.stringify(Object.fromEntries(selectedIds.map((id) => [id, true])))
  }, [rowSelection, selectedIds])

  const table = useDataTable({
    columns,
    data: categoriesData || [],
    getRowId: (row) => row.id,
    isLoading,
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: setRowSelection,
    },
  })

  const selectedCategories = useMemo(() => {
    if (!categoriesData) return []
    return categoriesData
      .filter((cat) => rowSelection[cat.id])
      .map((cat) => ({
        id: cat.id,
        parentId: cat.parent_category_id || undefined,
        value: cat.name.trim(),
      }))
  }, [rowSelection, categoriesData])

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

  const saveFeedCategories = (
    selectedCategories: CategorySetting[]
  ) => {
    const updatedFeed = {
      id: feed?.id!,
      settings: { categories: selectedCategories },
    }
    updateFeedMutate(updatedFeed)
  }

  return (
    <>
      <Container className="divide-y p-0">
        <DataTable instance={table}>
          <Header
            title={i18n.t("settings.categories.title")}
            subtitle={i18n.t("settings.categories.subtitle")}
            actions={[
              {
                type: "button",
                props: {
                  children: i18n.t("actions.save"),
                  variant: "secondary",
                  onClick: () => {
                    try {
                      saveFeedCategories(selectedCategories)
                      toast.success(i18n.t("general.success"), {
                        description: i18n.t("feeds.toasts.categoriesSaved"),
                      })
                    } catch (e) {
                      console.error(e)
                      toast.error(i18n.t("general.error"), {
                        description: i18n.t("feeds.toasts.categoriesSaveFailed"),
                      })
                    }
                  },
                  disabled: !isModified,
                },
              },
            ]}
          />
          <DataTable.Table />
        </DataTable>
      </Container>
    </>
  )
}
