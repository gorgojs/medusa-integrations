import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  WorkflowData,
  transform,
} from '@medusajs/framework/workflows-sdk'
import { FEED_MODULE } from '../modules/feed'
import FeedModuleService from '../modules/feed/service'
import { updateFeedsWorkflow } from "./update-feeds"
import { deleteFilesWorkflow } from "@medusajs/medusa/core-flows"

export type GetFeedFilesIdsStepInput = string[]

export const getFeedFilesIdsStep = createStep(
  'get-feed-files-ids-step',
  async (ids: GetFeedFilesIdsStepInput, { container }) => {
    const service = container.resolve<FeedModuleService>(FEED_MODULE)
    const feeds = await service.listFeeds({ id: ids })
    const feedFilesIds = feeds
      .filter(item => {
        const isValidPath = item.file_path 
          && typeof item.file_path === 'string' 
          && item.file_path.trim().length > 0
        return isValidPath
      })
      .map(item => item.file_path as string)
      .map(path => {
        const cleanPath = path.split('?')[0].split('#')[0]
        const parts = cleanPath.split('/')
        const fileName = parts[parts.length - 1]
        return fileName.includes('.') ? fileName : null
      })
      .filter((fileName): fileName is string => fileName !== null)
    return new StepResponse(feedFilesIds)
  }
)

export type DeleteFeedFilesWorkflowInput = {
  ids: string[]
}

export const deleteFeedFilesWorkflow = createWorkflow(
  'delete-feed-files-workflow',
  (input: WorkflowData<DeleteFeedFilesWorkflowInput>) => {
    const feedFilesIds = getFeedFilesIdsStep(input.ids)
    deleteFilesWorkflow
      .runAsStep({
        input: {
          ids: feedFilesIds
        }
      })
    const feedsToUpdate = transform(
      { input },
      (data) => data.input.ids.map((id) => {
        return ({
          id: id,
          file_path: "",
          last_export_at: null
        })
      })
    )
    updateFeedsWorkflow.runAsStep({
      input: feedsToUpdate,
    })
    return new WorkflowResponse(input.ids)
  }
)
