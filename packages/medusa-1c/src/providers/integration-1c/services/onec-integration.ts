import { AbstractIntegrationProvider, defineIntegration } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput, z } from "@gorgo/medusa-integration"
import { ONEC_ICON } from "../icon"

export const ONEC_INTEGRATION_IDENTIFIER = "1c"

const descriptor = defineIntegration({
  category: "erp",
  displayName: "onec.name",
  description: "onec.description",
  icon: ONEC_ICON,
  docsUrl: "https://docs.gorgojs.com/medusa-plugins/1c-enterprise",

  options: {
    interval: {
      type: "number",
      default: 0,
      min: 0,
      int: true,
      control: "number",
      label: "onec.fields.interval",
      hint: "onec.hints.interval",
    },
    chunkSize: {
      type: "number",
      default: 10 * 1024 * 1024,
      min: 0,
      int: true,
      control: "number",
      label: "onec.fields.chunkSize",
      hint: "onec.hints.chunkSize",
    },
    useZip: {
      type: "boolean",
      default: false,
      control: "switch",
      label: "onec.fields.useZip",
      hint: "onec.hints.useZip",
    },
    height: {
      type: "string",
      control: "text",
      label: "onec.fields.height",
      placeholder: "onec.placeholders.attributeId",
    },
    width: {
      type: "string",
      control: "text",
      label: "onec.fields.width",
      placeholder: "onec.placeholders.attributeId",
    },
    length: {
      type: "string",
      control: "text",
      label: "onec.fields.length",
      placeholder: "onec.placeholders.attributeId",
    },
    weight: {
      type: "string",
      control: "text",
      label: "onec.fields.weight",
      placeholder: "onec.placeholders.attributeId",
    },
    mid_code: {
      type: "string",
      control: "text",
      label: "onec.fields.midCode",
      placeholder: "onec.placeholders.attributeId",
    },
    hs_code: {
      type: "string",
      control: "text",
      label: "onec.fields.hsCode",
      placeholder: "onec.placeholders.attributeId",
    },
    origin_country: {
      type: "string",
      control: "text",
      label: "onec.fields.originCountry",
      placeholder: "onec.placeholders.attributeId",
    },
  },

  sections: [
    {
      id: "sync",
      title: "onec.sections.sync",
      options: ["interval", "chunkSize", "useZip"],
    },
    {
      id: "attributes",
      title: "onec.sections.attributes",
      options: [
        "height",
        "width",
        "length",
        "weight",
        "mid_code",
        "hs_code",
        "origin_country",
      ],
    },
  ],

  // No outbound endpoint to probe (1C calls into Medusa, not the reverse) — checks completeness instead.
  testConnection: async ({ options }) => {
    if (options.interval == null || options.chunkSize == null || options.useZip == null) {
      return { status: "failed", message: "Sync settings are incomplete" }
    }
    return { status: "passed" }
  },
})

export type OnecOptions = z.infer<typeof descriptor.optionsSchema>

export class OnecIntegrationProvider extends AbstractIntegrationProvider {
  static identifier = ONEC_INTEGRATION_IDENTIFIER

  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default OnecIntegrationProvider
