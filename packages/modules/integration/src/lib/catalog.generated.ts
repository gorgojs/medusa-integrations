/* eslint-disable */
// AUTO-GENERATED from src/lib/integrations.yml by scripts/gen-catalog.mjs.
// Do not edit by hand — run `node scripts/gen-catalog.mjs` to regenerate.

import type { CatalogIntegration } from "../types"

export const FALLBACK_CATALOG: CatalogIntegration[] = [
  {
    "integrationId": "1c",
    "slug": "gorgo-medusa-1c",
    "npm": "@gorgo/medusa-1c",
    "category": "erp",
    "author": "gorgo",
    "authorLocalized": "Gorgo",
    "label": "1C:Enterprise",
    "shortDescription": "Data exchange between Medusa and 1C:Enterprise ERP",
    "repository": "https://github.com/gorgojs/medusa-plugins",
    "docsUrl": "https://docs.gorgojs.com/medusa-plugins/1c-enterprise",
    "configSnippet": "// Registered as a module, not an integration provider:\n{\n  resolve: \"@gorgo/medusa-1c\",\n}\n",
    "icon": "/api/plugin-icon?slug=gorgo-medusa-1c",
    "stars": null,
    "downloads": null
  },
  {
    "integrationId": "apiship",
    "slug": "gorgo-medusa-fulfillment-apiship",
    "npm": "@gorgo/medusa-fulfillment-apiship",
    "category": "fulfillment",
    "author": "gorgo",
    "authorLocalized": "Gorgo",
    "label": "ApiShip",
    "shortDescription": "Multi-carrier shipping aggregation via ApiShip",
    "repository": "https://github.com/gorgojs/medusa-plugins",
    "docsUrl": "https://docs.gorgojs.com/medusa-plugins/apiship",
    "icon": "/api/plugin-icon?slug=gorgo-medusa-fulfillment-apiship",
    "stars": null,
    "downloads": null
  },
  {
    "integrationId": "robokassa",
    "slug": "gorgo-medusa-payment-robokassa",
    "npm": "@gorgo/medusa-payment-robokassa",
    "category": "payment",
    "author": "gorgo",
    "authorLocalized": "Gorgo",
    "label": "Robokassa",
    "shortDescription": "Accept payments via Robokassa",
    "repository": "https://github.com/gorgojs/medusa-plugins",
    "docsUrl": "https://docs.gorgojs.com/medusa-plugins/robokassa",
    "configSnippet": "{\n  resolve: \"@gorgo/medusa-payment-robokassa\",\n  options: {\n    // credentials & settings are managed in Admin, not here\n  },\n}\n",
    "icon": "/api/plugin-icon?slug=gorgo-medusa-payment-robokassa",
    "stars": null,
    "downloads": null
  },
  {
    "integrationId": "tkassa",
    "slug": "gorgo-medusa-payment-tkassa",
    "npm": "@gorgo/medusa-payment-tkassa",
    "category": "payment",
    "author": "gorgo",
    "authorLocalized": "Gorgo",
    "label": "T-Kassa",
    "shortDescription": "Accept payments via T-Kassa by T-Bank",
    "repository": "https://github.com/gorgojs/medusa-plugins",
    "docsUrl": "https://docs.gorgojs.com/medusa-plugins/t-kassa",
    "configSnippet": "{\n  resolve: \"@gorgo/medusa-payment-tkassa\",\n  options: {\n    // credentials & settings are managed in Admin, not here\n  },\n}\n",
    "icon": "/api/plugin-icon?slug=gorgo-medusa-payment-tkassa",
    "stars": null,
    "downloads": null
  },
  {
    "integrationId": "yookassa",
    "slug": "gorgo-medusa-payment-yookassa",
    "npm": "@gorgo/medusa-payment-yookassa",
    "category": "payment",
    "author": "gorgo",
    "authorLocalized": "Gorgo",
    "label": "YooKassa",
    "shortDescription": "Accept payments via YooKassa",
    "repository": "https://github.com/gorgojs/medusa-plugins",
    "docsUrl": "https://docs.gorgojs.com/medusa-plugins/yookassa",
    "configSnippet": "{\n  resolve: \"@gorgo/medusa-payment-yookassa\",\n  options: {\n    // credentials & settings are managed in Admin, not here\n  },\n}\n",
    "icon": "/api/plugin-icon?slug=gorgo-medusa-payment-yookassa",
    "stars": null,
    "downloads": null
  }
]
