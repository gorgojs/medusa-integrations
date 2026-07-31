import {
  type CostDeliveryCostVatEnum,
} from "../../lib/apiship-client"

type Primitive = string | number | boolean | bigint | symbol | null | undefined

export type DeepPartial<T> =
  T extends Primitive
    ? T
    : T extends Array<infer U>
      ? Array<DeepPartial<U>>
      : { [K in keyof T]?: DeepPartial<T[K]> }

export interface ApishipConnectionDTO {
  id: string
  name?: string
  provider_key: string
  provider_connect_id: string
  point_in_id?: string
  point_in_address?: string
  is_enabled: boolean
}

/**
 * Конфигурация ApiShip в собранном виде — плоская, один в один с каталогом опций дескриптора.
 * Собирается из строки интеграции через `assembleApishipOptions`.
 */
export interface ApishipOptionsDTO {
  /**
   * Токен ApiShip
   */
  token: string
  /**
   * Использовать тестовый режим
   */
  is_test: boolean
  /**
   * Использовать ли наложенный платеж при создании заказа
   */
  is_cod: boolean
  /**
   * Процентная ставка НДС:
   * -1 - Без НДС
   * 0 - НДС 0%
   * 5 - НДС 5%
   * 7 - НДС 7%
   * 10 - НДС 10%
   * 20 - НДС 20%
   * 22 - НДС 22%
   */
  delivery_cost_vat: CostDeliveryCostVatEnum
  /**
   * Длина товара по умолчанию
   */
  default_product_length: number
  /**
   * Ширина товара по умолчанию
   */
  default_product_width: number
  /**
   * Высота товара по умолчанию
   */
  default_product_height: number
  /**
   * Вес товара по умолчанию
   */
  default_product_weight: number
  /**
   * Код страны отправителя в соответствии с ISO 3166-1 alpha-2
   */
  sender_country_code: string
  /**
   * Полный адрес отправителя одной строкой
   */
  sender_address_string: string
  /**
   * ФИО контактного лица отправителя
   */
  sender_contact_name: string
  /**
   * Контактный телефон отправителя
   */
  sender_phone: string
  /**
   * Подключённые службы доставки
   */
  connections: ApishipConnectionDTO[]
}

/**
 * Как конфигурация лежит в строке интеграции: плоские опции дескриптора плюс json-блоб
 * `settings`, в котором остался только список подключений (для списка записей в каталоге
 * контролов дескриптора нет варианта, поэтому его редактирует виджет плагина).
 *
 * `delivery_cost_vat` — строка: enum-опции модуля строковые, к числу приводит
 * `assembleApishipOptions`.
 */
export interface StoredApishipOptions {
  token?: string
  is_test?: boolean
  is_cod?: boolean
  delivery_cost_vat?: string
  default_product_length?: number
  default_product_width?: number
  default_product_height?: number
  default_product_weight?: number
  sender_country_code?: string
  sender_address_string?: string
  sender_contact_name?: string
  sender_phone?: string
  settings?: {
    connections?: DeepPartial<ApishipConnectionDTO>[]
  }
}

export interface ApishipAccountConnectionDTO {
  id: string
  provider_key: string
  name?: string
}
