export const prettifyRedactedToken = (token: string) => {
  return token.replace("***", `•••`)
}

export function maskToken(value: string): string {
  if (value.length <= 7) {
    return value
  }
  const start = value.slice(0, 5)
  const end = value.slice(-2)
  return `${start}***${end}`
}