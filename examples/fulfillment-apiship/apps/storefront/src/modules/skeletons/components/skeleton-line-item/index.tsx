const SkeletonLineItem = () => {
  return (
    <li className="flex items-center gap-x-4 py-4 first:pt-0 last:pb-0">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-large bg-gray-200" />

      <div className="flex min-w-0 flex-1 flex-col gap-y-2">
        <div className="h-4 w-32 animate-pulse bg-gray-200" />
        <div className="h-4 w-24 animate-pulse bg-gray-200" />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-y-2">
        <div className="h-4 w-20 animate-pulse bg-gray-200" />
        <div className="h-4 w-12 animate-pulse bg-gray-200" />
      </div>
    </li>
  )
}

export default SkeletonLineItem
