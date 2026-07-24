import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  WorkflowData
} from '@medusajs/framework/workflows-sdk'
import { FEED_MODULE } from '../modules/feed'
import FeedModuleService from '../modules/feed/service'

export type DeleteFeedsStepInput = string[]

export const deleteFeedsStep = createStep(
  'delete-feeds-step',
  async (ids: DeleteFeedsStepInput, { container }) => {
    const service = container.resolve<FeedModuleService>(FEED_MODULE)
    const rawResult = await service.softDeleteFeeds(ids)
    const deletedIds = rawResult?.feed_id
    
    return new StepResponse(ids, deletedIds)
  },
  async (prevIds: DeleteFeedsStepInput, { container }) => {
    const service = container.resolve<FeedModuleService>(FEED_MODULE)
    await service.restoreFeeds(prevIds)
  }
)

export type DeleteFeedsWorkflowInput = {
  ids: string[]
}

export const deleteFeedsWorkflow = createWorkflow(
  'delete-feeds-workflow',
  (input: WorkflowData<DeleteFeedsWorkflowInput>) => {
    const deletedFeeds = deleteFeedsStep(input.ids)
    return new WorkflowResponse(deletedFeeds)
  }
)