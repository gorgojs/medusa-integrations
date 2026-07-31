export interface StoreGetApishipPointList {
  key?: string
  filter?: string
  fields?: string
  limit?: number
  offset?: number
  shipping_option_id?: string
  provider_id?: string
}

export interface StoreCalculateApishipShippingOption {
  cart_id: string
}
