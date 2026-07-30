export {}

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    "gorgo.integration.tkassa.before": true
    "gorgo.integration.tkassa.after": true
    "gorgo.integration.tkassa.side.before": true
    "gorgo.integration.tkassa.side.after": true
  }
}
