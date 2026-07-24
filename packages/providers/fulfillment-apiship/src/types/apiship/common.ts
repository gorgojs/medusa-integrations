import {
  type CostDeliveryCostVatEnum,
} from "../../lib/apiship-client"

export const FulfillmentProviderKeys = {
  APISHIP: "apiship",
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined

export type DeepPartial<T> =
  T extends Primitive
    ? T
    : T extends Array<infer U>
      ? Array<DeepPartial<U>>
      : { [K in keyof T]?: DeepPartial<T[K]> }

interface DefaultSenderSettingsDTO {
  /**
   * Код страны в соответствии с ISO 3166-1 alpha-2
   */
  country_code: string
  /**
   * Полный адрес одной строкой. При заполнении этого поля остальные можно не заполнять, кроме countryCode
   */
  address_string: string
  /**
   * ФИО контактного лица
   */
  contact_name: string
  /**
   * Контактный телефон
   */
  phone: string
}

interface DefaultProductSizesDTO {
  /**
   * Длина товара по умолчанию
   */
  length: number
  /**
   * Ширина товара по умолчанию
   */
  width: number
  /**
   * Высота товара по умолчанию
   */
  height: number
  /**
   * Вес товара по умолчанию
   */
  weight: number
}

export interface ApishipConnectionDTO {
  id: string
  name?: string
  provider_key: string
  provider_connect_id: string
  point_in_id?: string
  point_in_address?: string
  is_enabled: boolean
}

export interface SettingsDTO {
  /**
   * Подключения
   */
  connections?: ApishipConnectionDTO[]
  /**
   * Параменты магазина по умолчанию
   */
  default_sender_settings: DefaultSenderSettingsDTO
  /**
   * Размеры товара по умолчанию
   */
  default_product_sizes: DefaultProductSizesDTO
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
   * Использовать ли наложенный платеж при создании заказа
   */
  is_cod: boolean
}

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
   * Параменты провайдера
   */
  settings: SettingsDTO
}

export interface ApishipAccountConnectionDTO {
  id: string
  provider_key: string
  name?: string
}
