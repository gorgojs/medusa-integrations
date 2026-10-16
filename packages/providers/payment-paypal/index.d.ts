export {}

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    "gorgo.integration.paypal": true,
    "gorgo.integration.paypal.side": true
  }
}
