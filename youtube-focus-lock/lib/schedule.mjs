function integerPart(parts, type) {
  const value = parts.find((part) => part.type === type)?.value;
  if (value == null) throw new Error(`Missing ${type} from formatted time`);
  return Number.parseInt(value, 10);
}

export function minuteOfDay(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return integerPart(parts, "hour") * 60 + integerPart(parts, "minute");
}

export function isAllowedAt(date, config) {
  const minute = minuteOfDay(date, config.timeZone);
  return minute >= config.allowedStartMinute && minute < config.allowedEndMinute;
}

export function findNextTransition(fromDate, config, horizonMinutes = 27 * 60) {
  const startState = isAllowedAt(fromDate, config);
  const base = fromDate.getTime();

  for (let minute = 1; minute <= horizonMinutes; minute += 1) {
    const probe = new Date(base + minute * 60_000);
    if (isAllowedAt(probe, config) !== startState) {
      const d = new Date(probe);
      d.setUTCSeconds(0, 0);
      return d;
    }
  }

  throw new Error("No schedule transition found within horizon");
}

export function formatWindow(config) {
  const hhmm = (minute) => {
    const h24 = Math.floor(minute / 60);
    const m = minute % 60;
    const suffix = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };
  return `${hhmm(config.allowedStartMinute)}–${hhmm(config.allowedEndMinute)}`;
}
