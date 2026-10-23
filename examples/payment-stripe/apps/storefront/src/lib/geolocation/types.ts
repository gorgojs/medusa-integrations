export type GeolocationContext = {
  headers: Headers
  cf?: { country?: string | null }
}

export type GeolocationProvider = {
  name: string
  lookup: (context: GeolocationContext) => Promise<string | null>
}
