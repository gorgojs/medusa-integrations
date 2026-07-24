export interface Settings {
  name?: string
  company?: string
  url?: string
  platform?: string
  categories?: Category[]
}

export interface Category {
  id: string
  parentId?: string
  value: string
}
