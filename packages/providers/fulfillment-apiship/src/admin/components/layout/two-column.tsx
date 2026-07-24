export type TwoColumnLayoutProps = {
  firstCol: React.ReactNode
  secondCol: React.ReactNode
}

export const TwoColumnLayout = ({
  firstCol,
  secondCol,
}: TwoColumnLayoutProps) => {
  return (
    <div className="flex flex-col gap-y-3 xl:flex-row xl:gap-x-4 xl:items-start">
      <div className="flex flex-col w-full gap-y-3">
        {firstCol}
      </div>

      <div className="flex flex-col w-full xl:max-w-[440px] gap-y-3 xl:mt-0">
        {secondCol}
      </div>
    </div>
  )
}
