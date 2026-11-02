jest.mock(
  "@gorgo/telemetry",
  () => ({ createTelemetryClient: () => ({ track: () => {} }) }),
  { virtual: true }
)

import { runFeedsWorkflow } from "../run-feeds"
import {
  makeContainer,
  makeFeed,
  makeProduct,
  offerBlocks,
  onlyFile,
  readFeedXml,
  section,
} from "./fakes"

const MINUTE = 60 * 1000

const shoeShopSettings = {
  name: "Gorgo Store",
  company: "Gorgo LLC",
  url: "https://store.example.com",
  platform: "Medusa",
  categories: [
    { id: "pcat_shoes", value: "Shoes" },
    { id: "pcat_boots", parentId: "pcat_shoes", value: "Boots" },
  ],
}

const sneaker = makeProduct({
  id: "prod_sneaker",
  title: "Runner Sneaker",
  category_ids: ["pcat_shoes"],
  thumbnail: "https://cdn.example.com/sneaker.jpg",
  description: "Light running shoe",
  weight: "0.45",
  length: "30",
  width: "12",
  height: "10",
  origin_country: "VN",
  metadata: {
    barcode: ["4601234567890", "4601234567891"],
    param: [
      { name: "Color", value: "White" },
      { name: "Size", unit: "EU", value: "42" },
    ],
    manufacturer_warranty: true,
  },
})

const chelseaBoot = makeProduct({
  id: "prod_chelsea",
  title: "Chelsea Boot",
  category_ids: ["pcat_boots"],
})

const draftBoot = makeProduct({
  id: "prod_draft",
  title: "Unreleased Boot",
  status: "draft",
  category_ids: ["pcat_boots"],
})

async function generate(products = [sneaker, chelseaBoot, draftBoot], settings: any = shoeShopSettings) {
  const deps = makeContainer({
    feeds: [makeFeed({ id: "feed_shoes", file_name: "shoes", settings })],
    products,
  })
  const { result } = await runFeedsWorkflow(deps.container).run({ input: { ids: ["feed_shoes"] } })
  const file = onlyFile(deps.fileService)
  return { ...deps, result, file, xml: readFeedXml(file) }
}

describe("runFeedsWorkflow", () => {
  describe("feed file", () => {
    it("uploads a public gzipped file named after the feed", async () => {
      const { file } = await generate()

      expect(file).toMatchObject({
        filename: "shoes.xml.gz",
        mimeType: "application/gzip",
        access: "public",
      })
    })

    it("stores a UTF-8 YML catalog stamped with the export time", async () => {
      const { xml } = await generate()

      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
      expect(xml).toMatch(/<yml_catalog date="\d{4}-\d{2}-\d{2} \d{2}:\d{2}">/)
    })
  })

  describe("shop header", () => {
    it("takes the shop name, company, url and platform from the feed settings", async () => {
      const { xml } = await generate()

      expect(xml).toContain("<name>Gorgo Store</name>")
      expect(xml).toContain("<company>Gorgo LLC</company>")
      expect(xml).toContain("<url>https://store.example.com</url>")
      expect(xml).toContain("<platform>Medusa</platform>")
    })

    it("puts a dash in every header field the settings leave out", async () => {
      const { xml, productService } = await generate([sneaker], null)

      expect(xml).toContain("<name>-</name>")
      expect(xml).toContain("<company>-</company>")
      expect(xml).toContain("<url>-</url>")
      expect(xml).toContain("<platform>-</platform>")
      expect(xml).toContain("<categories/>")
      expect(xml).toContain("<offers/>")
      expect(productService.listProducts).not.toHaveBeenCalled()
    })

    it("treats empty strings in the settings as missing", async () => {
      const { xml } = await generate([], { name: "", company: "", url: "", platform: "" })

      expect(xml).toContain("<name>-</name>")
      expect(xml).toContain("<company>-</company>")
    })

    it("lists the selected categories with their parent links", async () => {
      const { xml } = await generate()

      expect(xml).toMatch(/<category id="pcat_shoes"[ />]/)
      expect(xml).toMatch(/<category id="pcat_boots" parentId="pcat_shoes"[ />]/)
    })

    it.skip("writes each category name as the element text", async () => {
      const { xml } = await generate()

      expect(section(xml, "categories")).toBe(
        [
          "<categories>",
          '<category id="pcat_shoes">Shoes</category>',
          '<category id="pcat_boots" parentId="pcat_shoes">Boots</category>',
          "</categories>",
        ].join("\n")
      )
    })
  })

  describe("offers", () => {
    it("asks the product module for the published products of each selected category", async () => {
      const { productService } = await generate()

      expect(productService.listProducts).toHaveBeenCalledTimes(2)
      expect(productService.listProducts).toHaveBeenCalledWith({
        status: "published",
        categories: { id: { $in: ["pcat_shoes"] } },
      })
      expect(productService.listProducts).toHaveBeenCalledWith({
        status: "published",
        categories: { id: { $in: ["pcat_boots"] } },
      })
    })

    it("turns every published product into an offer of its category", async () => {
      const { xml } = await generate()

      expect(section(xml, "offers")).toBe(
        [
          "<offers>",
          '<offer id="prod_sneaker">',
          "<name>Runner Sneaker</name>",
          "<categoryId>pcat_shoes</categoryId>",
          "<picture>https://cdn.example.com/sneaker.jpg</picture>",
          "<description>",
          "<![CDATA[Light running shoe]]>",
          "</description>",
          "<weight>0.45</weight>",
          "<dimensions>30/12/10</dimensions>",
          "<barcode>4601234567890</barcode>",
          "<barcode>4601234567891</barcode>",
          '<param name="Color">White</param>',
          '<param name="Size" unit="EU">42</param>',
          "<country_of_origin>VN</country_of_origin>",
          "<manufacturer_warranty>true</manufacturer_warranty>",
          "</offer>",
          '<offer id="prod_chelsea">',
          "<name>Chelsea Boot</name>",
          "<categoryId>pcat_boots</categoryId>",
          "</offer>",
          "</offers>",
        ].join("\n")
      )
    })

    it("leaves out products that are not published", async () => {
      const { xml } = await generate()

      expect(xml).not.toContain("prod_draft")
      expect(xml).not.toContain("Unreleased Boot")
    })

    it("leaves out every optional element the product cannot fill", async () => {
      const { xml } = await generate([
        makeProduct({
          id: "prod_bare",
          title: "Bare Boot",
          category_ids: ["pcat_boots"],
          thumbnail: "",
          description: "",
          weight: "about a kilo",
          length: "10",
          width: "20",
          height: null,
          origin_country: "",
          metadata: {
            barcode: "4601234567890",
            param: { name: "Color", value: "Red" },
            manufacturer_warranty: "true",
          },
        }),
      ])

      expect(offerBlocks(xml)).toEqual([
        ['<offer id="prod_bare">', "<name>Bare Boot</name>", "<categoryId>pcat_boots</categoryId>", "</offer>"].join(
          "\n"
        ),
      ])
    })

    it("handles a product without metadata", async () => {
      const { xml } = await generate([
        makeProduct({ id: "prod_plain", title: "Plain Boot", category_ids: ["pcat_boots"], metadata: null }),
      ])

      expect(offerBlocks(xml)).toHaveLength(1)
      expect(xml).toContain("<name>Plain Boot</name>")
    })

    it.each([
      ["0", "0"],
      ["1.250", "1.25"],
      [2.5, "2.5"],
      ["3 kg", "3"],
    ])("writes the weight %p as %s", async (weight, expected) => {
      const { xml } = await generate([
        makeProduct({ id: "prod_w", title: "Weighted", category_ids: ["pcat_shoes"], weight }),
      ])

      expect(xml).toContain(`<weight>${expected}</weight>`)
    })

    it("escapes XML special characters in text and attributes", async () => {
      const { xml } = await generate(
        [
          makeProduct({
            id: "prod_special",
            title: 'Tom & Jerry <Deluxe> "Edition"',
            category_ids: ["pcat_shoes"],
            metadata: { param: [{ name: 'Size "EU"', value: "5 < 6 & 7 > 4" }] },
          }),
        ],
        { ...shoeShopSettings, name: "Ромашка & Co", company: "<Romashka>" }
      )

      expect(xml).toContain("<name>Ромашка &amp; Co</name>")
      expect(xml).toContain("<company>&lt;Romashka&gt;</company>")
      expect(xml).toContain('<name>Tom &amp; Jerry &lt;Deluxe&gt; "Edition"</name>')
      expect(xml).toContain('<param name="Size &quot;EU&quot;">5 &lt; 6 &amp; 7 &gt; 4</param>')
    })

    it("keeps HTML descriptions intact inside CDATA", async () => {
      const { xml } = await generate([
        makeProduct({
          id: "prod_html",
          title: "Html",
          category_ids: ["pcat_shoes"],
          description: "<p>Soft & warm</p>",
        }),
      ])

      expect(xml).toContain("<![CDATA[<p>Soft & warm</p>]]>")
    })

    it("splits a description that contains the CDATA terminator", async () => {
      const { xml } = await generate([
        makeProduct({
          id: "prod_cdata",
          title: "Cdata",
          category_ids: ["pcat_shoes"],
          description: "Use ]]> carefully",
        }),
      ])

      expect(xml).toContain("<![CDATA[Use ]]]]><![CDATA[> carefully]]>")
    })

    it("writes an empty offers list when no selected category has published products", async () => {
      const { xml } = await generate([draftBoot])

      expect(xml).toContain("<offers/>")
    })

    it.skip("lists a product that belongs to two selected categories once", async () => {
      const { xml } = await generate([
        makeProduct({ id: "prod_both", title: "Hybrid", category_ids: ["pcat_shoes", "pcat_boots"] }),
      ])

      expect(offerBlocks(xml)).toHaveLength(1)
    })
  })

  describe("feed record", () => {
    it("points the feed at the new file and stamps the export time", async () => {
      const startedAt = Date.now()
      const { result, file, feedService } = await generate()

      const feed = feedService.feeds.get("feed_shoes")!
      expect(feed.file_path).toBe(file.url)
      expect(new Date(feed.last_export_at!).getTime()).toBeGreaterThanOrEqual(startedAt)
      expect(new Date(feed.last_export_at!).getTime()).toBeLessThanOrEqual(Date.now())
      expect(result).toEqual([expect.objectContaining({ id: "feed_shoes", file_path: file.url })])
    })

    it("deletes the file of the previous export and keeps the new one", async () => {
      const deps = makeContainer({
        feeds: [
          makeFeed({
            id: "feed_shoes",
            file_name: "shoes",
            file_path: "http://localhost:9000/static/1690000000000-shoes.xml.gz",
            last_export_at: new Date(Date.now() - 60 * MINUTE),
          }),
        ],
      })

      await runFeedsWorkflow(deps.container).run({ input: { ids: ["feed_shoes"] } })

      expect(deps.fileService.deleteFiles).toHaveBeenCalledWith(["1690000000000-shoes.xml.gz"])
      const file = onlyFile(deps.fileService)
      expect(deps.feedService.feeds.get("feed_shoes")!.file_path).toBe(file.url)
    })
  })

  describe("choosing feeds", () => {
    it("generates every requested feed, active or not", async () => {
      const deps = makeContainer({
        feeds: [
          makeFeed({ id: "feed_on", file_name: "on", is_active: true }),
          makeFeed({ id: "feed_off", file_name: "off", is_active: false }),
          makeFeed({ id: "feed_other", file_name: "other" }),
        ],
      })

      const { result } = await runFeedsWorkflow(deps.container).run({
        input: { ids: ["feed_on", "feed_off"] },
      })

      const names = [...deps.fileService.files.values()].map((file) => file.filename).sort()
      expect(names).toEqual(["off.xml.gz", "on.xml.gz"])
      expect(result.map((feed) => feed.id).sort()).toEqual(["feed_off", "feed_on"])
    })

    it("on a scheduled run exports only active feeds whose interval has passed", async () => {
      const now = Date.now()
      const deps = makeContainer({
        feeds: [
          makeFeed({ id: "feed_new", file_name: "new", last_export_at: null }),
          makeFeed({ id: "feed_due", file_name: "due", schedule: 30, last_export_at: new Date(now - 31 * MINUTE) }),
          makeFeed({ id: "feed_fresh", file_name: "fresh", schedule: 30, last_export_at: new Date(now - 10 * MINUTE) }),
          makeFeed({ id: "feed_hourly", file_name: "hourly", schedule: 120, last_export_at: new Date(now - 90 * MINUTE) }),
          makeFeed({ id: "feed_off", file_name: "off", is_active: false, last_export_at: null }),
        ],
      })

      await runFeedsWorkflow(deps.container).run({ input: { ids: [] } })

      expect(deps.feedService.listFeeds).toHaveBeenCalledWith({ is_active: true })
      const names = [...deps.fileService.files.values()].map((file) => file.filename).sort()
      expect(names).toEqual(["due.xml.gz", "new.xml.gz"])
    })

    it("does nothing on a scheduled run when no feed is due", async () => {
      const deps = makeContainer({
        feeds: [makeFeed({ id: "feed_fresh", last_export_at: new Date(Date.now() - 5 * MINUTE) })],
      })

      const { result } = await runFeedsWorkflow(deps.container).run({ input: { ids: [] } })

      expect(result).toEqual([])
      expect(deps.fileService.createFiles).not.toHaveBeenCalled()
      expect(deps.feedService.feeds.get("feed_fresh")!.file_path).toBeNull()
    })
  })
})
