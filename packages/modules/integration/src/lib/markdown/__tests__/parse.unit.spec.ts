import { parseMarkdown, fenceLabel, MD_MAX_CHARS, MD_MAX_BLOCKS } from "../parse"

describe("fenceLabel", () => {
  it("keeps a filename", () => expect(fenceLabel("medusa-config.ts")).toBe("medusa-config.ts"))
  it("takes only the first token", () => expect(fenceLabel('ts title="x" onload=y')).toBe("ts"))
  it("strips disallowed characters", () => expect(fenceLabel('<img>')).toBe("img"))
  it("returns null for empty info", () => expect(fenceLabel("   ")).toBeNull())
  it("caps at 40 chars", () => expect(fenceLabel("a".repeat(60))).toHaveLength(40))
})

describe("parseMarkdown", () => {
  it("returns an empty list for empty input", () => {
    expect(parseMarkdown("")).toEqual([])
  })

  it("shifts heading levels below the drawer title", () => {
    expect(parseMarkdown("# a\n\n## b\n\n### c")).toEqual([
      { type: "heading", level: 2, children: [{ type: "text", value: "a" }] },
      { type: "heading", level: 3, children: [{ type: "text", value: "b" }] },
      { type: "heading", level: 4, children: [{ type: "text", value: "c" }] },
    ])
  })

  it("treats #### as a paragraph", () => {
    expect(parseMarkdown("#### deep")).toEqual([
      { type: "paragraph", children: [{ type: "text", value: "#### deep" }] },
    ])
  })

  it("joins consecutive lines into one paragraph", () => {
    expect(parseMarkdown("one\ntwo\n\nthree")).toEqual([
      { type: "paragraph", children: [{ type: "text", value: "one two" }] },
      { type: "paragraph", children: [{ type: "text", value: "three" }] },
    ])
  })

  it("parses an unordered list", () => {
    expect(parseMarkdown("- a\n- b")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [[{ type: "text", value: "a" }], [{ type: "text", value: "b" }]],
      },
    ])
  })

  it("parses an ordered list", () => {
    expect(parseMarkdown("1. a\n2. b")).toEqual([
      {
        type: "list",
        ordered: true,
        items: [[{ type: "text", value: "a" }], [{ type: "text", value: "b" }]],
      },
    ])
  })

  it("parses a fenced code block with a label", () => {
    expect(parseMarkdown("```medusa-config.ts\nconst a = 1\n```")).toEqual([
      { type: "codeBlock", label: "medusa-config.ts", value: "const a = 1" },
    ])
  })

  it("does not parse markup inside a code block", () => {
    const [block] = parseMarkdown("```\n# not a heading\n- not a list\n```")
    expect(block).toEqual({
      type: "codeBlock",
      label: null,
      value: "# not a heading\n- not a list",
    })
  })

  it("closes an unterminated fence at EOF", () => {
    expect(parseMarkdown("```\nabc")).toEqual([
      { type: "codeBlock", label: null, value: "abc" },
    ])
  })

  it("parses a horizontal rule without eating list bullets", () => {
    expect(parseMarkdown("---\n\n- a")).toEqual([
      { type: "hr" },
      { type: "list", ordered: false, items: [[{ type: "text", value: "a" }]] },
    ])
  })

  it("normalises CRLF", () => {
    expect(parseMarkdown("a\r\n\r\nb")).toHaveLength(2)
  })

  it("replaces all content with a truncation notice past the char cap", () => {
    expect(parseMarkdown("x".repeat(MD_MAX_CHARS + 1))).toEqual([{ type: "truncated" }])
  })

  it("replaces all content with a truncation notice past the block cap", () => {
    expect(parseMarkdown("- a\n\n".repeat(MD_MAX_BLOCKS + 1))).toEqual([{ type: "truncated" }])
  })

  it("counts list items individually against the block cap", () => {
    // A single list run collapses into one block, but renders one node per item — so an
    // all-items snippet must be capped by item count, not by its one-block shape.
    const items = Array.from({ length: MD_MAX_BLOCKS + 1 }, (_, i) => `- item ${i}`).join("\n")
    expect(parseMarkdown(items)).toEqual([{ type: "truncated" }])
  })
})
