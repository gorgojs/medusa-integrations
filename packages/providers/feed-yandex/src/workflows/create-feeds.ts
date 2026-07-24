import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  WorkflowData
} from '@medusajs/framework/workflows-sdk'
import { FEED_MODULE } from '../modules/feed'
import FeedModuleService from '../modules/feed/service'

export type CreateFeedsStepInput = {
  file_name: string
  is_active: boolean
  schedule?: number
}[]

export const createFeedsStep = createStep(
  'create-feeds-step',
  async (input: CreateFeedsStepInput, { container }) => {
    const service = container.resolve<FeedModuleService>(FEED_MODULE)
    const createdFeeds = await service.createFeeds(input)
    const ids = createdFeeds.map((createdFeed) => {
        return createdFeed.id
    })
    return new StepResponse(createdFeeds, ids)
  },
  async (prevIds: string[], { container }) => {
    const service = container.resolve<FeedModuleService>(FEED_MODULE)
    await service.deleteFeeds(prevIds)
  }
)

export type CreateFeedsWorkflowInput = {
  file_name: string
  is_active: boolean
  schedule?: number
}[]

export const createFeedsWorkflow = createWorkflow(
  'create-feeds-workflow',
  (input: WorkflowData<CreateFeedsWorkflowInput>) => {
    const createdFeeds = createFeedsStep(input)
    return new WorkflowResponse(createdFeeds)
  }
)
