export const MA5_TIMEZONE = "America/Indiana/Indianapolis";

/** Local calendar parts in the gym timezone. */
export function zonedParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: MA5_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function zonedDayStart(
  year: number,
  month: number,
  day: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const local = zonedParts(guess);
  const offsetHours = 12 - local.hour;
  return new Date(guess.getTime() + offsetHours * 60 * 60 * 1000);
}

export function startOfToday(): Date {
  const { year, month, day } = zonedParts();
  return zonedDayStart(year, month, day);
}

export function startOfMonth(date = new Date()): Date {
  const { year, month } = zonedParts(date);
  return zonedDayStart(year, month, 1);
}

export function startOfYear(date = new Date()): Date {
  const { year } = zonedParts(date);
  return zonedDayStart(year, 1, 1);
}

/** Monday 00:00 in gym timezone for the week containing `date`. */
export function startOfWeek(date = new Date()): Date {
  const { year, month, day } = zonedParts(date);
  const noon = zonedDayStart(year, month, day);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: MA5_TIMEZONE,
    weekday: "short",
  }).format(noon);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const idx = order.indexOf(weekday);
  const daysFromMonday = idx < 0 ? 0 : idx;
  return new Date(noon.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMonths(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function monthShortLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: MA5_TIMEZONE,
  }).format(zonedDayStart(year, month, 1));
}

export function formatRelativeWhen(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 60 * 60_000) {
    const m = Math.floor(diffMs / 60_000);
    return `${m} min ago`;
  }
  if (diffMs < 24 * 60 * 60_000) {
    const h = Math.floor(diffMs / (60 * 60_000));
    return `${h} hr ago`;
  }
  const days = Math.floor(diffMs / (24 * 60 * 60_000));
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: MA5_TIMEZONE,
  }).format(new Date(iso));
}

export function formatTimeOfDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: MA5_TIMEZONE,
  }).format(new Date(iso));
}
