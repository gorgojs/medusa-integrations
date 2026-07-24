import { i18n } from "../components/utilities/i18n"

export const getScheduleLabel = (minutes: number | undefined) => {
  if (minutes === undefined || minutes < 0) {
    return "-"
  }
  const hours = Math.floor(minutes / 60)
  switch (true) {
    case hours == 0:
      return `${minutes} ${i18n.t("dateTime.minutes")}`
    case hours >= 1 && hours < 24:
      return `${hours} ${i18n.t("dateTime.hours")}`
    case hours >= 24:
      return `${Math.floor(hours / 24)} ${i18n.t("dateTime.days")}`
  }
}
