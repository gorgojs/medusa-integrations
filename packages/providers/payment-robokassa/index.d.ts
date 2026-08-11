export {}

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    "gorgo.integration.robokassa": true,
    "gorgo.integration.robokassa.side": true
  }
}
