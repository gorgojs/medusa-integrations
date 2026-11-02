import {
  ContainerRegistrationKeys,
  createMedusaContainer,
  Modules,
} from "@medusajs/framework/utils"
import { asValue } from "@medusajs/framework/awilix"
import { gunzipSync } from "zlib"
import { FEED_MODULE } from "../../modules/feed"
import type { Settings } from "../../types/settings"

export type FeedRecord = {
  id: string
  title: string | null
  file_name: string | null
  file_path: string | null
  last_export_at: Date | null
  is_active: boolean
  schedule: number
  settings: Settings | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type ProductRecord = {
  id: string
  title: string
  status: string
  category_ids: string[]
  thumbnail?: string | null
  description?: string | null
  weight?: string | number | null
  length?: string | null
  width?: string | null
  height?: string | null
  origin_country?: string | null
  metadata?: Record<string, unknown> | null
}

export type StoredFile = {
  id: string
  url: string
  filename: string
  mimeType: string
  access: string
  content: string
}

export function makeFeed(overrides: Partial<FeedRecord> = {}): FeedRecord {
  return {
    id: "feed_1",
    title: "Main feed",
    file_name: "main",
    file_path: null,
    last_export_at: null,
    is_active: true,
    schedule: 30,
    settings: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
    deleted_at: null,
    ...overrides,
  }
}

export function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "prod_1",
    title: "Product",
    status: "published",
    category_ids: [],
    ...overrides,
  }
}

function matches(record: Record<string, unknown>, filters: Record<string, unknown>) {
  return Object.entries(filters).every(([key, value]) =>
    Array.isArray(value) ? value.includes(record[key]) : record[key] === value
  )
}

export function makeFeedService(initial: FeedRecord[] = []) {
  const feeds = new Map(initial.map((feed) => [feed.id, { ...feed }]))
  let sequence = 0

  return {
    feeds,
    listFeeds: jest.fn(async (filters: Record<string, unknown> = {}) =>
      [...feeds.values()]
        .filter((feed) => !feed.deleted_at && matches(feed, filters))
        .map((feed) => ({ ...feed }))
    ),
    createFeeds: jest.fn(async (data: Partial<FeedRecord>[]) =>
      data.map((input) => {
        sequence += 1
        const feed = makeFeed({
          id: `feed_new_${sequence}`,
          title: null,
          file_name: null,
          is_active: false,
          ...input,
        })
        feeds.set(feed.id, feed)
        return { ...feed }
      })
    ),
    updateFeeds: jest.fn(async (data: (Partial<FeedRecord> & { id: string })[]) =>
      data.map(({ id, ...changes }) => {
        const feed = { ...feeds.get(id)!, ...changes }
        feeds.set(id, feed)
        return { ...feed }
      })
    ),
    softDeleteFeeds: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => {
        const feed = feeds.get(id)
        if (feed) {
          feed.deleted_at = new Date()
        }
      })
      return { feed_id: ids }
    }),
    restoreFeeds: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => {
        const feed = feeds.get(id)
        if (feed) {
          feed.deleted_at = null
        }
      })
    }),
    deleteFeeds: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => feeds.delete(id))
    }),
  }
}

export function makeFileService() {
  const files = new Map<string, StoredFile>()
  let clock = 1700000000000

  return {
    files,
    createFiles: jest.fn(async (input: Omit<StoredFile, "id" | "url">) => {
      clock += 1
      const id = `${clock}-${input.filename}`
      const url = new URL(id, "http://localhost:9000/static/").toString()
      files.set(id, { id, url, ...input })
      return { id, url }
    }),
    deleteFiles: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => files.delete(id))
    }),
    getAsBuffer: jest.fn(async (id: string) => {
      const file = files.get(id)
      if (!file) {
        throw new Error(`File with id ${id} was not found`)
      }
      return Buffer.from(file.content, "base64")
    }),
  }
}

export function makeProductService(products: ProductRecord[] = []) {
  return {
    listProducts: jest.fn(async (filters: Record<string, any> = {}) => {
      const categoryIds: string[] | undefined = filters.categories?.id?.$in
      return products
        .filter((product) => !filters.status || product.status === filters.status)
        .filter(
          (product) =>
            !categoryIds || product.category_ids.some((id) => categoryIds.includes(id))
        )
        .map(({ category_ids, ...product }) => ({ ...product }))
    }),
  }
}

export function makeQuery(feedService: ReturnType<typeof makeFeedService>) {
  return {
    graph: jest.fn(
      async (
        config: { entity: string; filters?: Record<string, unknown>; pagination?: { take?: number; skip?: number } },
        options?: { throwIfKeyNotFound?: boolean }
      ) => {
        const data = await feedService.listFeeds(config.filters ?? {})
        if (options?.throwIfKeyNotFound && data.length === 0) {
          throw new Error(`${config.entity} was not found`)
        }
        return {
          data,
          metadata: {
            count: data.length,
            take: config.pagination?.take,
            skip: config.pagination?.skip,
          },
        }
      }
    ),
  }
}

export function makeContainer({
  feeds = [],
  products = [],
}: { feeds?: FeedRecord[]; products?: ProductRecord[] } = {}) {
  const feedService = makeFeedService(feeds)
  const fileService = makeFileService()
  const productService = makeProductService(products)
  const query = makeQuery(feedService)
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }

  const container = createMedusaContainer()
  container.register({
    [FEED_MODULE]: asValue(feedService),
    [Modules.FILE]: asValue(fileService),
    [Modules.PRODUCT]: asValue(productService),
    [ContainerRegistrationKeys.QUERY]: asValue(query),
    [ContainerRegistrationKeys.LOGGER]: asValue(logger),
  })

  return { container, feedService, fileService, productService, query, logger }
}

export function readFeedXml(file: StoredFile) {
  return gunzipSync(Buffer.from(file.content, "base64")).toString("utf-8")
}

export function onlyFile(fileService: ReturnType<typeof makeFileService>) {
  const files = [...fileService.files.values()]
  if (files.length !== 1) {
    throw new Error(`Expected one stored file, found ${files.length}`)
  }
  return files[0]
}

export function section(xml: string, tag: string) {
  const start = xml.indexOf(`<${tag}>`)
  const end = xml.indexOf(`</${tag}>`)
  if (start === -1 || end === -1) {
    return null
  }
  return xml
    .slice(start, end + tag.length + 3)
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
}

export function offerBlocks(xml: string) {
  return (xml.match(/<offer id="[^"]*">[\s\S]*?<\/offer>/g) ?? []).map((block) =>
    block
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
  )
}

export function makeResponse() {
  const res: Record<string, jest.Mock> = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  res.setHeader = jest.fn(() => res)
  res.send = jest.fn(() => res)
  return res
}
