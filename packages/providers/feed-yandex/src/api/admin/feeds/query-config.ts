export const defaultAdminFeedFields = [
  "id",
  "title",
  "file_name",
  "file_path",
  "is_active",
  "schedule",
  "last_export_at",
  "created_at",
  "updated_at"
]

export const retrieveTransformQueryConfig = {
  defaults: defaultAdminFeedFields,
  isList: false,
}

export const listTransformQueryConfig = {
  defaults: defaultAdminFeedFields,
  defaultLimit: 20,
  isList: true,
}