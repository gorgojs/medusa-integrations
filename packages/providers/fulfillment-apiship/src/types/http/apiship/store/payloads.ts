export interface StoreGetApishipPointList {
  key?: string
  filter?: string
  fields?: string
  limit?: number
  offset?: number
}

export interface StoreCalculateApishipShippingOption {
  cart_id: string
}
