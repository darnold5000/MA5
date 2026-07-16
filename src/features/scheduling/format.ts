export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatSessionWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(iso));
}

/** e.g. "Tomorrow" / "Friday" / "Jul 18" */
export function formatSessionDay(iso: string): string {
  const tz = "America/Indiana/Indianapolis";
  const target = new Date(iso);
  const todayKey = toSessionDayKey(new Date().toISOString());
  const targetKey = toSessionDayKey(iso);
  if (targetKey === todayKey) return "Today";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (targetKey === toSessionDayKey(tomorrow.toISOString())) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: tz,
  }).format(target);
}

/** e.g. "45 min" */
export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes % 60 === 0 && minutes >= 60) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hr" : `${hours} hr`;
  }
  return `${minutes} min`;
}

/** Derive length from start/end when duration isn't stored. */
export function durationFromRange(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 60;
  return Math.max(1, Math.round(ms / 60_000));
}

/** e.g. "6:00 PM" */
export function formatSessionTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(iso));
}

export function greetingForNow(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Indiana/Indianapolis",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Local calendar day key (YYYY-MM-DD) in America/Indiana/Indianapolis. */
export function toSessionDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Indiana/Indianapolis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(Date.UTC(year, monthIndex, 1, 12)));
}
