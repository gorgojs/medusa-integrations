import { isSafeHref } from "../href"
import { parseInline } from "../inline"

describe("isSafeHref", () => {
  it("accepts https", () => {
    expect(isSafeHref("https://docs.gorgojs.com/x")).toBe(true)
  })

  it.each([
    ["http", "http://example.com"],
    ["javascript", "javascript:alert(1)"],
    ["javascript with leading space", "  javascript:alert(1)"],
    ["javascript with embedded newline", "java\nscript:alert(1)"],
    ["data", "data:text/html;base64,PHNjcmlwdD4="],
    ["vbscript", "vbscript:msgbox(1)"],
    ["file", "file:///etc/passwd"],
    ["protocol-relative", "//evil.host/x"],
    ["relative", "/settings/integrations"],
    ["garbage", "not a url"],
    ["empty", ""],
  ])("rejects %s", (_label, href) => {
    expect(isSafeHref(href)).toBe(false)
  })
})

describe("parseInline", () => {
  it("returns a single text node for plain text", () => {
    expect(parseInline("just words")).toEqual([{ type: "text", value: "just words" }])
  })

  it("parses inline code", () => {
    expect(parseInline("run `yarn add x` now")).toEqual([
      { type: "text", value: "run " },
      { type: "code", value: "yarn add x" },
      { type: "text", value: " now" },
    ])
  })

  it("treats markup inside inline code as literal", () => {
    expect(parseInline("`**x**`")).toEqual([{ type: "code", value: "**x**" }])
  })

  it("parses strong and em", () => {
    expect(parseInline("**b** and *i* and _u_")).toEqual([
      { type: "strong", children: [{ type: "text", value: "b" }] },
      { type: "text", value: " and " },
      { type: "em", children: [{ type: "text", value: "i" }] },
      { type: "text", value: " and " },
      { type: "em", children: [{ type: "text", value: "u" }] },
    ])
  })

  it("parses an https link", () => {
    expect(parseInline("see [docs](https://docs.gorgojs.com)")).toEqual([
      { type: "text", value: "see " },
      {
        type: "link",
        href: "https://docs.gorgojs.com",
        children: [{ type: "text", value: "docs" }],
      },
    ])
  })

  it("degrades an unsafe link to its literal source", () => {
    expect(parseInline("[Click](javascript:alert(1))")).toEqual([
      { type: "text", value: "[Click](javascript:alert(1)" },
      { type: "text", value: ")" },
    ])
  })

  it("degrades an image to literal text", () => {
    expect(parseInline("![alt](https://x/y.png)")).toEqual([
      { type: "text", value: "!" },
      { type: "text", value: "[alt](https://x/y.png)" },
    ])
  })

  it("keeps raw HTML as literal text", () => {
    const src = '<script>alert(1)</script><img onerror="x">'
    expect(parseInline(src)).toEqual([{ type: "text", value: src }])
  })

  it("parses inline code inside strong", () => {
    expect(parseInline("**run `x`**")).toEqual([
      {
        type: "strong",
        children: [
          { type: "text", value: "run " },
          { type: "code", value: "x" },
        ],
      },
    ])
  })

  it("terminates on pathological emphasis input", () => {
    expect(() => parseInline("_".repeat(200))).not.toThrow()
    expect(() => parseInline("*".repeat(200))).not.toThrow()
  })
})
