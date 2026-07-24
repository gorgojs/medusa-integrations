import { z } from "@medusajs/deps/zod"
import type { OptionDef } from "./option"

/**
 * Build a zod schema for one option from our declarative properties. Presence: an option is
 * OPTIONAL unless `required: true`; a `default` makes it always-present (and satisfies required).
 * `json` is opaque (`z.unknown()`) — its shape is checked by the option's imperative `validate`.
 */
export function optionToZod(def: OptionDef): z.ZodType {
  const schema = buildOptionSchema(def)
  if (def.type === "string" || def.type === "json")
    return z.preprocess((v) => (v === null ? undefined : v), schema)
  return z.preprocess((v) => (v === "" || v === null ? undefined : v), schema)
}

function buildOptionSchema(def: OptionDef): z.ZodType {
  let base: z.ZodType
  switch (def.type) {
    case "string": {
      let s = z.string()
      if (def.minLength != null) s = s.min(def.minLength)
      if (def.maxLength != null) s = s.max(def.maxLength)
      if (def.pattern != null) s = s.regex(new RegExp(def.pattern))
      base = s
      break
    }
    case "url": {
      // Restrict the scheme when `protocols` is given (e.g. ["https"] → protocol /^(?:https)$/).
      const protocol =
        def.protocols && def.protocols.length > 0
          ? new RegExp(`^(?:${def.protocols.join("|")})$`)
          : undefined
      base = protocol ? z.url({ protocol }) : z.url()
      break
    }
    case "email": {
      base = z.email()
      break
    }
    case "uuid": {
      base = z.uuid()
      break
    }
    case "number": {
      let n = z.number()
      if (def.int) n = n.int()
      if (def.positive) n = n.positive()
      if (def.nonnegative) n = n.nonnegative()
      if (def.multipleOf != null) n = n.multipleOf(def.multipleOf)
      if (def.min != null) n = n.min(def.min)
      if (def.max != null) n = n.max(def.max)
      base = n
      break
    }
    case "boolean":
      base = z.boolean()
      break
    case "enum":
      base = z.enum(def.values as [string, ...string[]])
      break
    case "json": {
      // Opaque JSON; presence handled here (z.unknown() otherwise accepts undefined).
      if (def.default !== undefined) return z.unknown().default(def.default as never)
      if (def.required) return z.unknown().refine((v) => v !== undefined, { message: "Required" })
      return z.unknown().optional()
    }
    default: {
      const _never: never = def
      throw new Error(`Unsupported option type: ${JSON.stringify(_never)}`)
    }
  }

  if (def.default !== undefined) return base.default(def.default as never)
  if (!def.required) return base.optional()
  return base
}
