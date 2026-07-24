import { AdminApishipOptions } from "./entities"

export interface AdminCreateApishipConnection {
  name?: string
  provider_key: string
  provider_connect_id: string
  point_in_id?: string
  point_in_address?: string
  is_enabled: boolean
}

export interface AdminUpdateApishipConnection {
  name?: string
  provider_key?: string
  provider_connect_id?: string
  point_in_id?: string
  point_in_address?: string
  is_enabled?: boolean
}

export interface AdminGetApishipPointList {
  key?: string
  filter?: string
  fields?: string
  limit?: number
  offset?: number
}

export interface AdminUpdateApishipOptions extends AdminApishipOptions { }