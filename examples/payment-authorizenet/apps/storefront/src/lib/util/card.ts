/** The card fields of the Authorize.net form, as the customer typed them. */
export type CardFields = {
  number: string
  expiry: string
  cvc: string
}

export const EMPTY_CARD: CardFields = { number: "", expiry: "", cvc: "" }

/** A problem with the card fields, named after its key in the `AuthorizeNetCard` catalog. */
export type CardProblem = "invalidNumber" | "invalidExpiry" | "invalidCvc"

export const digitsOnly = (value: string) => value.replace(/\D/g, "")

/** Groups the digits by four, the way a card shows them: `4111 1111 1111 1111`. */
export const formatCardNumber = (value: string) =>
  digitsOnly(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")

/** `MM / YY` as the customer types it. */
export const formatExpiry = (value: string) => {
  const digits = digitsOnly(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits
}

/** The Luhn checksum every card number carries in its last digit. */
export const passesLuhn = (digits: string) => {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return digits.length > 0 && sum % 10 === 0
}

/** The month and the four-digit year of `MM / YY`, or null when it is not a date. */
export const parseExpiry = (value: string) => {
  const digits = digitsOnly(value)
  if (digits.length !== 4) {
    return null
  }
  const month = Number(digits.slice(0, 2))
  if (month < 1 || month > 12) {
    return null
  }
  return { month: digits.slice(0, 2), year: `20${digits.slice(2)}` }
}

/**
 * The first problem with the card fields, or null when they can go to Accept.js. The checks are
 * the ones Accept.js makes itself, done first so the customer reads them in their language.
 */
export const findCardProblem = (card: CardFields, now = new Date()): CardProblem | null => {
  const number = digitsOnly(card.number)
  if (number.length < 13 || number.length > 19 || !passesLuhn(number)) {
    return "invalidNumber"
  }
  const expiry = parseExpiry(card.expiry)
  const thisMonth = now.getFullYear() * 12 + now.getMonth() + 1
  if (!expiry || Number(expiry.year) * 12 + Number(expiry.month) < thisMonth) {
    return "invalidExpiry"
  }
  if (!/^\d{3,4}$/.test(card.cvc)) {
    return "invalidCvc"
  }
  return null
}
