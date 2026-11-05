export {}

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    "gorgo.integration.authorizenet": true,
    "gorgo.integration.authorizenet.side": true
  }
}
