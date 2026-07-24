import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { FEED_MODULE } from '../modules/feed';
import FeedModuleService from '../modules/feed/service';

export type UpdateFeedsStepInput = {
  id: string
  title?: string
  file_name?: string
  file_path?: string
  schedule?: number
  last_export_at?: Date | null
  is_active?: boolean
}[]

export const updateFeedsStep = createStep(
  'update-feeds-step',
  async (feeds: UpdateFeedsStepInput, { container }) => {
    const service = container.resolve<FeedModuleService>(FEED_MODULE)
    const updatedFeeds = await service.updateFeeds(feeds);
    return new StepResponse(updatedFeeds);
  }
)

export type UpdateFeedsWorkflowInput = {
  id: string
  title?: string
  file_name?: string
  file_path?: string
  schedule?: number
  last_export_at?: Date | null
  is_active?: boolean
}[]

export const updateFeedsWorkflow = createWorkflow(
  'update-feeds-workflow',
  (input: UpdateFeedsWorkflowInput) => {
    const updatedFeeds = updateFeedsStep(input);
    return new WorkflowResponse(updatedFeeds);
  }
);