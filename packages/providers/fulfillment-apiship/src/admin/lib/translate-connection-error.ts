export function translateConnectionError(
  error: any,
  t: (key: string) => string,
  fallbackKey: string
): string {
  const message: string = error?.message ?? ""

  if (/already exists/i.test(message)) {
    return t("apiship.connections.form.errors.duplicateForLocation")
  }

  return message || t(fallbackKey)
}
