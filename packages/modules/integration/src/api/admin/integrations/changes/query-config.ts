// List rows leave out where the request came from; the detail returns every column.
export const defaultAdminIntegrationChangeListFields = [
  "id",
  "occurred_at",
  "actor_type",
  "actor_id",
  "actor_label",
  "change_type",
  "outcome",
  "provider_id",
  "identifier",
  "instance_id",
  "category",
  "section_id",
  "diff",
  "message",
  "reverts_id",
]

export const defaultAdminIntegrationChangeFields = [
  ...defaultAdminIntegrationChangeListFields,
  "request_id",
  "ip",
  "user_agent",
  "created_at",
  "updated_at",
]

export const retrieveTransformQueryConfig = {
  defaults: defaultAdminIntegrationChangeFields,
  isList: false,
}

export const listTransformQueryConfig = {
  defaults: defaultAdminIntegrationChangeListFields,
  defaultLimit: 20,
  isList: true,
}
