import { Tooltip } from "@medusajs/ui"
import { PlaceholderCell } from "../placeholder-cell"
import { useDate } from "../../../../hooks/use-date"

type DateCellProps = {
  date?: Date | string | null,
  mode?: "full" | "relative"
}

export const DateCell = ({ date, mode = "full" }: DateCellProps) => {
  const { getFullDate, getRelativeDate } = useDate()

  if (!date) {
    return <PlaceholderCell />
  }

  let displayDate: string
  switch (mode) {
    case "full":
      displayDate = getFullDate({ date, includeTime: false })
      break
    case "relative":
      displayDate = getRelativeDate(date)
      break
  }

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <Tooltip
        className="z-10"
        content={
          <span className="text-pretty">{`${getFullDate({
            date,
            includeTime: true,
          })}`}</span>
        }
      >
        <span className="truncate">
          {displayDate}
        </span>
      </Tooltip>
    </div>
  )
}
