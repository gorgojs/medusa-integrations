import { BaseApishipConnection } from "../common"

export interface AdminCreateApishipConnection {
  name?: string
  provider_key: string
  provider_connect_id: string
  point_in_id?: string
  point_in_address?: string
  stock_location_id?: string
  allowed_door_tariff_ids?: string[]
  allowed_point_tariff_ids?: string[]
  is_enabled: boolean
}

export interface AdminUpdateApishipConnection {
  name?: string
  provider_key?: string
  provider_connect_id?: string
  point_in_id?: string
  point_in_address?: string
  stock_location_id?: string
  allowed_door_tariff_ids?: string[]
  allowed_point_tariff_ids?: string[]
  is_enabled?: boolean
}

export interface AdminGetApishipPointList {
  key?: string
  filter?: string
  fields?: string
  limit?: number
  offset?: number
  provider_id?: string
}

export interface AdminGetApishipTariffList {
  provider_key: string
  provider_id?: string
}

/**
 * Only the connection list — everything else in the config is a descriptor option written
 * through `POST /admin/integrations/:provider_id`.
 */
export interface AdminUpdateApishipOptions {
  connections?: BaseApishipConnection[]
}