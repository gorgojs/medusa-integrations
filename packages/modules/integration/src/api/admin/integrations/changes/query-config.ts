// List rows leave out where the request came from; the detail returns every column.
export const defaultAdminIntegrationChangeListFields = [
  "id",
  "created_at",
  "actor_type",
  "actor_id",
  "actor_label",
  "change_type",
  "provider_id",
  "diff",
  "metadata",
]

export const defaultAdminIntegrationChangeFields = [
  ...defaultAdminIntegrationChangeListFields,
  "request_id",
  "ip",
  "user_agent",
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
