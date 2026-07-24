import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { upsertIntegrationWorkflow, deleteIntegrationWorkflow } from "../../../../workflows/integration"
import { service, maskedView, requireProvider } from "../_helpers"
import type { AdminUpsertIntegrationType } from "../validators"
import type {
  AdminIntegrationResponse,
  AdminIntegrationUpsertResponse,
  AdminIntegrationDeleteResponse,
} from "../../../../types"

/** Descriptor (UI schema) + current masked record + completeness for one declared instance. */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationResponse>
) => {
  const svc = service(req)
  const provider_id = req.params.provider_id
  requireProvider(svc, provider_id)
  const descriptor = svc.getProviderUiDescriptor(provider_id)
  const record = await svc.findByProviderId(provider_id)
  const is_complete = record ? svc.isComplete(record) : false
  res.json({
    descriptor,
    integration: record ? maskedView(record, svc.getSecretKeys(provider_id)) : null,
    is_complete,
    ...svc.getPackageMeta(provider_id),
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpsertIntegrationType>,
  res: MedusaResponse<AdminIntegrationUpsertResponse>
) => {
  const svc = service(req)
  const provider_id = req.params.provider_id
  requireProvider(svc, provider_id)

  // Only the submitted option ids are validated (inside the workflow step) — a built-in
  // section sends its section's ids, a widget may send option ids with no section_id — with
  // a readable, field-prefixed message on failure. The config as a whole may remain a
  // partial draft; full validation happens lazily at resolve time.
  const { result } = await upsertIntegrationWorkflow(req.scope).run({
    input: {
      provider_id,
      section_id: req.validatedBody.section_id,
      title: req.validatedBody.title,
      values: req.validatedBody.values,
    },
  })
  res.json({ integration: maskedView(result, svc.getSecretKeys(provider_id)) })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationDeleteResponse>
) => {
  const svc = service(req)
  const provider_id = req.params.provider_id
  requireProvider(svc, provider_id)
  await deleteIntegrationWorkflow(req.scope).run({
    input: { provider_id },
  })
  res.json({ id: provider_id, object: "integration", deleted: true })
}
