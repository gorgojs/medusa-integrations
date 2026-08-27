import { Module } from "@medusajs/framework/utils"
import IntegrationModuleService from "./services/integration-module"
import { checkLicenses, loadProviders } from "./loaders"

export const INTEGRATION_MODULE = "integration"

export default Module(INTEGRATION_MODULE, {
  service: IntegrationModuleService,
  loaders: [loadProviders, checkLicenses],
})

export type { IntegrationModuleOptions } from "./types"
