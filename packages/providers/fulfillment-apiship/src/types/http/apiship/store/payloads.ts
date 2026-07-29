export interface StoreGetApishipPointList {
  key?: string
  filter?: string
  fields?: string
  limit?: number
  offset?: number
  provider_id?: string
  shipping_option_id?: string
}

export interface StoreCalculateApishipShippingOption {
  cart_id: string
}
