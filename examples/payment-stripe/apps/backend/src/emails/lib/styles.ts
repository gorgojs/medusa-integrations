import type * as React from "react";

/**
 * One style sheet for every transactional email, so a change lands in all of
 * them at once instead of in eight near-identical copies.
 *
 * The values come from the same design system the storefront renders with,
 * `@medusajs/ui-preset`: the zinc palette behind `ui-fg-base`, `ui-fg-subtle`,
 * `ui-border-base` and friends, and the type scale behind `h1-docs`,
 * `txt-medium` and `txt-small`. Email clients cannot resolve Tailwind classes
 * or CSS variables, so the tokens are inlined here as literals. When the preset
 * moves, these move with it.
 */

/**
 * Inter is what the storefront loads, and it leads the stack so a client that
 * has it renders the same face. The rest is the system stack every mail client
 * can resolve on its own, with Arial last for the oldest of them.
 */
export const fontFamily =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const color = {
  /** --fg-base */
  base: "#18181b",
  /** --fg-subtle */
  subtle: "#52525b",
  /** --fg-muted */
  muted: "#71717a",
  /** --fg-on-color */
  onColor: "#ffffff",
  /** --bg-base */
  bg: "#ffffff",
  /** --bg-subtle */
  bgSubtle: "#fafafa",
  /** --border-base */
  border: "#e4e4e7",
  /** --button-inverted */
  buttonInverted: "#27272a",
  /**
   * --fg-interactive, taking the storefront's accessible override from
   * `globals.css` (blue-600) rather than the preset's blue-500, which falls
   * below the WCAG AA contrast threshold on white at body size.
   */
  interactive: "#2563eb",
} as const;

/* Layout ------------------------------------------------------------------ */

export const body: React.CSSProperties = {
  margin: 0,
  padding: "24px 12px",
  backgroundColor: color.bgSubtle,
  fontFamily,
};

export const container: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: color.bg,
  border: `1px solid ${color.border}`,
  borderRadius: "8px",
  overflow: "hidden",
};

export const header: React.CSSProperties = {
  padding: "20px 32px",
  borderBottom: `1px solid ${color.border}`,
};

export const brand: React.CSSProperties = {
  margin: 0,
  fontFamily,
  color: color.base,
  fontSize: "16px",
  lineHeight: "24px",
  fontWeight: 600,
  textTransform: "uppercase",
};

export const content: React.CSSProperties = {
  padding: "32px",
  fontFamily,
  color: color.base,
  fontSize: "14px",
  lineHeight: "22px",
};

export const divider: React.CSSProperties = {
  border: "none",
  borderTop: `1px solid ${color.border}`,
  margin: 0,
};

export const footer: React.CSSProperties = {
  padding: "20px 32px",
  backgroundColor: color.bgSubtle,
};

export const footerText: React.CSSProperties = {
  margin: "0 0 4px",
  fontFamily,
  color: color.muted,
  fontSize: "12px",
  lineHeight: "19px",
};

/* Content ----------------------------------------------------------------- */

/** h1-docs */
export const heading: React.CSSProperties = {
  margin: "0 0 12px",
  fontFamily,
  fontSize: "24px",
  lineHeight: "30px",
  fontWeight: 500,
  color: color.base,
};

/** txt-medium */
export const paragraph: React.CSSProperties = {
  margin: "0 0 16px",
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 400,
  color: color.subtle,
};

/** txt-small, for the aside under a call to action */
export const hint: React.CSSProperties = {
  margin: "0 0 16px",
  fontFamily,
  fontSize: "13px",
  lineHeight: "21px",
  color: color.muted,
};

/* Cards ------------------------------------------------------------------- */

export const card: React.CSSProperties = {
  margin: "0 0 16px",
  padding: "16px",
  border: `1px solid ${color.border}`,
  borderRadius: "8px",
  backgroundColor: color.bgSubtle,
};

/** txt-compact-xsmall, uppercased as the storefront labels its summary blocks */
export const cardTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontFamily,
  fontSize: "12px",
  lineHeight: "20px",
  fontWeight: 500,
  color: color.muted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

/* Line items -------------------------------------------------------------- */

export const itemRow: React.CSSProperties = {
  paddingBottom: "8px",
  marginBottom: "8px",
  borderBottom: `1px solid ${color.border}`,
};

export const itemName: React.CSSProperties = {
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  color: color.subtle,
};

export const itemPrice: React.CSSProperties = {
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  color: color.base,
  textAlign: "right",
  whiteSpace: "nowrap",
};

export const totalRow: React.CSSProperties = {
  paddingTop: "4px",
};

export const totalLabel: React.CSSProperties = {
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 500,
  color: color.base,
};

export const totalAmount: React.CSSProperties = {
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 500,
  color: color.base,
  textAlign: "right",
  whiteSpace: "nowrap",
};

/* Tracking ---------------------------------------------------------------- */

export const trackRow: React.CSSProperties = {
  paddingBottom: "4px",
};

export const trackLabel: React.CSSProperties = {
  margin: "0 0 2px",
  fontFamily,
  fontSize: "12px",
  lineHeight: "20px",
  color: color.muted,
};

export const trackValue: React.CSSProperties = {
  margin: 0,
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 500,
  color: color.base,
};

export const trackLink: React.CSSProperties = {
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 500,
  color: color.interactive,
  textDecoration: "none",
};

/* Actions ----------------------------------------------------------------- */

export const buttonSection: React.CSSProperties = {
  margin: "24px 0 8px",
};

export const button: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 20px",
  borderRadius: "6px",
  backgroundColor: color.buttonInverted,
  color: color.onColor,
  textDecoration: "none",
  fontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 500,
};

/** The closing "questions?" line, one step quieter than body copy */
export const footerNote: React.CSSProperties = {
  margin: "24px 0 0",
  paddingTop: "16px",
  borderTop: `1px solid ${color.border}`,
  fontFamily,
  fontSize: "13px",
  lineHeight: "21px",
  color: color.muted,
};

export const link: React.CSSProperties = {
  color: color.interactive,
  textDecoration: "none",
};
