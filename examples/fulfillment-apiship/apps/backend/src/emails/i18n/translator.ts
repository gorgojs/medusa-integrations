import IntlMessageFormat from "intl-messageformat";
import { STORE_NAME } from "./constants";
import {
  type EmailLocale,
  type LocaleDirection,
  FALLBACK_EMAIL_LOCALE,
  getLocaleDir,
} from "./locale";
import { emailMessages } from "./messages";

export type MessageValues = Record<string, string | number>;

type MessageTree = { [key: string]: string | MessageTree };

const formatterCache = new Map<string, IntlMessageFormat>();

function lookup(locale: EmailLocale, key: string): string | undefined {
  const path = key.split(".");
  let node: string | MessageTree | undefined = emailMessages[
    locale
  ] as unknown as MessageTree;

  for (const segment of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[segment];
  }

  return typeof node === "string" ? node : undefined;
}

function getFormatter(locale: EmailLocale, key: string): IntlMessageFormat {
  const cacheKey = `${locale}:${key}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) return cached;

  const message =
    lookup(locale, key) ?? lookup(FALLBACK_EMAIL_LOCALE, key) ?? key;

  const formatter = new IntlMessageFormat(message, locale, undefined, {
    ignoreTag: true,
  });
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailTranslator = {
  locale: EmailLocale;
  dir: LocaleDirection;
  t: (key: string, values?: MessageValues) => string;
  html: (key: string, values?: MessageValues) => string;
  money: (amount: number, currencyCode?: string | null) => string;
};

export function getEmailTranslator(locale: EmailLocale): EmailTranslator {
  const format = (key: string, values: MessageValues) =>
    String(getFormatter(locale, key).format({ store: STORE_NAME, ...values }));

  return {
    locale,
    dir: getLocaleDir(locale),
    t: (key, values = {}) => format(key, values),
    html: (key, values = {}) => {
      const escaped: MessageValues = {};
      for (const [name, value] of Object.entries(values)) {
        escaped[name] = escapeHtml(value);
      }
      return format(key, escaped);
    },
    money: (amount, currencyCode) => {
      const currency = currencyCode?.toUpperCase();
      if (currency) {
        try {
          return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
          }).format(amount);
        } catch {}
      }
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },
  };
}
