import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  transform,
  WorkflowData
} from '@medusajs/framework/workflows-sdk'
import { FEED_MODULE } from '../modules/feed'
import FeedModuleService from '../modules/feed/service'
import { updateFeedsWorkflow } from "./update-feeds"
import { deleteFeedFilesWorkflow } from "./delete-feed-files"
import { Category } from "../types/settings"
import yml from "yandex-market-language"
import { gzip } from "zlib"
import { promisify } from "util"

export type GetFeedsStepInput = string[]

export const getFeedsStep = createStep(
  'get-feeds-step',
  async (ids: GetFeedsStepInput, { container }) => {
    const service = container.resolve<FeedModuleService>(FEED_MODULE)
    let feeds // TODO: create feedDTO types
    if(ids.length > 0){
      feeds = await service.listFeeds({ id: ids })
    } else {
      const now = new Date();
      feeds = await service.listFeeds({ is_active: true })
      feeds = feeds.filter(feed => {
        if(!feed.last_export_at) return true
        const diffMs = now.getTime() - feed.last_export_at.getTime()
        return diffMs >= feed.schedule * 1000 * 60
      })
    }
    return new StepResponse(feeds)
  }
)

export type GenerateFeedFilesStepInput = {
  id: string
  title: string | null
  file_name: string | null
  file_path: string | null
  last_export_at: Date | null
  is_active: boolean
  schedule: number
  settings: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}[]

type CategorySetting = {
  id: string
  parentId?: string
  value: string
}

export const GenerateFeedFilesStep = createStep(
  'generate-feed-files-step',
  async (feeds: GenerateFeedFilesStepInput, { container }) => {
    const fileModuleService = container.resolve(Modules.FILE)
    const productModuleService = container.resolve("product")

    const generatedFeeds = await Promise.all(feeds.map(async (feed) => {
      const categoryIds = (feed.settings?.categories as Category[] ?? []).map(c => c.id)
      const categoryProductsMap = new Map()
      for (const categoryId of categoryIds) {
        const products = await productModuleService.listProducts({
          status: "published",
          categories: {
            id: { $in: [categoryId] }
          },
        })
        categoryProductsMap.set(categoryId, products)
      }

      const offers: any[] = []

      for (const [categoryId, products] of categoryProductsMap.entries()) {
        for (const product of products) {
          const offer: Record<string, any> = {
            id: product.id,
            name: product.title,
            categoryId: categoryId,
          }
          if (product.thumbnail) {
            offer.picture = [product.thumbnail]
          }
          if (product.description) {
            offer.description = product.description
          }
          const weight = parseFloat(product.weight)
          if (!isNaN(weight)) {
            offer.weight = weight
          }
          if (product.length && product.width && product.height) {
            offer.dimensions = [product.length, product.width, product.height]
          }
          if (product.metadata?.barcode && Array.isArray(product.metadata.barcode)) {
            offer.barcode = product.metadata.barcode
          }
          if (product.metadata?.param && Array.isArray(product.metadata.param)) {
            offer.param = product.metadata.param
          }
          if (product.origin_country) {
            offer.country_of_origin = product.origin_country
          }
          if (product.metadata?.manufacturer_warranty === true) {
            offer.manufacturer_warranty = true
          }
          offers.push(offer)
        }
      }

      const YmlObject = {
        name: feed.settings?.name || "-",
        company: feed.settings?.company || "-",
        url: feed.settings?.url || "-",
        platform: feed.settings?.platform || "-",
        categories: feed.settings?.categories || [],
        offers,
      }
      const ymlString = yml(YmlObject, { validate: false }).end({ pretty: true })
      const ymlBuffer = Buffer.from(ymlString, "utf-8")
      const gzipAsync = promisify(gzip)
      const gzipedBuffer = await gzipAsync(ymlBuffer)
      
      const fileDTO = await fileModuleService.createFiles({
        filename: `${feed.file_name}.xml.gz`,
        mimeType: "application/gzip",
        content: gzipedBuffer.toString("base64"),
        access: "public",
      })

      return ({
        id: feed.id,
        file_id: fileDTO.id,
        file_url: fileDTO.url
      })
    }))

    return new StepResponse(generatedFeeds)
  }
)

export type RunFeedsWorkflowInput = {
  ids: string[]
}

export const runFeedsWorkflow = createWorkflow(
  'run-feeds-workflow',
  (input: WorkflowData<RunFeedsWorkflowInput>) => {
    const feed = getFeedsStep(input.ids)
    const generatedFeeds = GenerateFeedFilesStep(feed)
    const feedsToDelete = transform(
      generatedFeeds,
      (data) => data.map((item) => {
        return (item.id)
      })
    )
    deleteFeedFilesWorkflow.runAsStep({
      input: { ids: feedsToDelete },
    })
    const feedsToUpdate = transform(
      generatedFeeds,
      (data) => data.map((item) => {
        return ({
          id: item.id,
          file_path: item.file_url,
          last_export_at: new Date()
        })
      })
    )
    const updatedFeeds = updateFeedsWorkflow.runAsStep({
      input: feedsToUpdate,
    })

    return new WorkflowResponse(updatedFeeds)
  }
)