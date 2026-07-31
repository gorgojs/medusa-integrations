import {
  type CostDeliveryCostVatEnum,
} from "../../../lib/apiship-client"

type Primitive = string | number | boolean | bigint | symbol | null | undefined

export type BaseCostDeliveryCostVatEnum = CostDeliveryCostVatEnum

export type DeepPartial<T> =
  T extends Primitive
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : { [K in keyof T]?: DeepPartial<T[K]> }

export interface BaseApishipConnection {
  id: string
  name?: string
  provider_key: string
  provider_connect_id: string
  point_in_id?: string
  point_in_address?: string
  is_enabled: boolean
}

/**
 * Плагинная часть конфигурации ApiShip на проводе. Секреты сюда не попадают, а всё, что
 * описано секциями дескриптора, читается через `GET /admin/integrations/:provider_id` —
 * здесь остаётся список подключений, который рисует виджет плагина.
 */
export interface BaseApishipOptions {
  /**
   * Подключённые службы доставки
   */
  connections?: BaseApishipConnection[]
}

export interface BaseApishipAccountConnection {
  id: string
  provider_key: string
  name?: string
}

export interface BaseApishipProvider {
  key?: string
  name?: string
  description?: string
}
