const currencyMultipliers = {
  0: [
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
  ],
  3: ["BHD", "IQD", "JOD", "KWD", "OMR", "TND"],
}

export function getCurrencyDecimals(currency: string): number {
  const code = currency.toUpperCase()
  let power = 2

  for (const [key, list] of Object.entries(currencyMultipliers)) {
    if (list.includes(code)) {
      power = parseInt(key, 10)
      break
    }
  }
  return power
}
export function getCurrencyMultiplier(currency: string): number {
  return 10 ** getCurrencyDecimals(currency)
}

export function formatCurrency(
  amount: number | string | bigint,
  currency: string
): string {
  const decimals = getCurrencyDecimals(currency)

  const n =
    typeof amount === "bigint"
      ? Number(amount)
      : typeof amount === "string"
      ? Number(amount.replace(",", "."))
      : amount

  const s = n.toFixed(decimals)
  return Number(s) === 0 ? (0).toFixed(decimals) : s
}
