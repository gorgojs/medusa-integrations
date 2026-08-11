export {}

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    "gorgo.integration.yookassa": true,
    "gorgo.integration.yookassa.side": true
  }
}
