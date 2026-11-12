export const getScheduleLabel = (minutes: number | undefined, t: (key: string) => string) => {
  if (minutes === undefined || minutes < 0) {
    return "-"
  }
  const hours = Math.floor(minutes / 60)
  switch (true) {
    case hours == 0:
      return `${minutes} ${t("feedYandex.dateTime.minutes")}`
    case hours >= 1 && hours < 24:
      return `${hours} ${t("feedYandex.dateTime.hours")}`
    case hours >= 24:
      return `${Math.floor(hours / 24)} ${t("feedYandex.dateTime.days")}`
  }
}
