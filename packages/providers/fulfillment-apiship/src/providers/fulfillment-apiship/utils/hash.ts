import crypto from "node:crypto"

function sortObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortObject)
  }

  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(obj[key])
        return acc
      }, {} as any)
  }

  return obj
}

export function hashObject(obj: unknown): string {
  const sorted = sortObject(obj)
  const str = JSON.stringify(sorted)

  return crypto
    .createHash("sha256")
    .update(str)
    .digest("hex")
}
