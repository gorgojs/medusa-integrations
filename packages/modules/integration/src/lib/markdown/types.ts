/** Inline nodes. A closed union — the renderer has no default branch. */
export type MdInline =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "strong"; children: MdInline[] }
  | { type: "em"; children: MdInline[] }
  | { type: "link"; href: string; children: MdInline[] }

/** Block nodes. `truncated` replaces all content when a size cap is hit. */
export type MdBlock =
  | { type: "heading"; level: 2 | 3 | 4; children: MdInline[] }
  | { type: "paragraph"; children: MdInline[] }
  | { type: "list"; ordered: boolean; items: MdInline[][] }
  | { type: "codeBlock"; label: string | null; value: string }
  | { type: "hr" }
  | { type: "truncated" }
