type JsonLdProps = {
  data: Record<string, unknown>
}

/**
 * Renders a schema.org graph. The payload is built server-side from catalog
 * data, and `<` is escaped so a product description containing markup cannot
 * close the script tag early.
 */
const JsonLd = ({ data }: JsonLdProps) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

export default JsonLd
