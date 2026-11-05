import { Container } from "@medusajs/ui"

const SkeletonProductPreview = () => {
  return (
    <div className="animate-pulse">
      <Container className="aspect-[9/16] w-full bg-gray-100 bg-ui-bg-subtle" />
      <div className="flex flex-col small:flex-row small:justify-between gap-y-1 text-base-regular mt-2">
        <div className="w-3/5 small:w-2/5 h-6 bg-gray-100"></div>
        <div className="w-2/5 small:w-1/5 h-6 bg-gray-100"></div>
      </div>
    </div>
  )
}

export default SkeletonProductPreview
