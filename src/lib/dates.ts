/** Day keys are local-time `YYYY-MM-DD`, so a day never shifts with the timezone. */
export type DayKey = string;

export function toKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DayKey {
  return toKey(new Date());
}

export function addDays(key: DayKey, delta: number): DayKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + delta);
  return toKey(d);
}

const longFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const dayMonthFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

/** "mardi 25 août" */
export function formatLong(key: DayKey): string {
  return longFmt.format(fromKey(key));
}

/** "mar. 25 août" */
export function formatShort(key: DayKey): string {
  return shortFmt.format(fromKey(key)).replace(/\.$/, "");
}

/** "25 août" */
export function formatDayMonth(key: DayKey): string {
  return dayMonthFmt.format(fromKey(key));
}

/** "août 2026" */
export function formatMonth(key: DayKey): string {
  return monthFmt.format(fromKey(key));
}

/** "lun 19" — the weekly grid column head. */
export function formatWeekdayShort(key: DayKey): string {
  const d = fromKey(key);
  return `${weekdayFmt.format(d).replace(/\.$/, "")} ${d.getDate()}`;
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Monday of the week containing `key` — French weeks start on Monday. */
export function startOfWeek(key: DayKey): DayKey {
  const d = fromKey(key);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return toKey(d);
}

export function weekDays(startKey: DayKey): DayKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
}

/** ISO week number, for the "semaine 35" eyebrow. */
export function isoWeekNumber(key: DayKey): number {
  const d = fromKey(key);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  target.setDate(target.getDate() - ((target.getDay() + 6) % 7) + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/** Every day of the month containing `key`, up to today when it is the current month. */
export function monthDaysUpTo(key: DayKey, limit: DayKey): DayKey[] {
  const d = fromKey(key);
  const days: DayKey[] = [];
  const month = d.getMonth();
  const cursor = new Date(d.getFullYear(), month, 1);
  while (cursor.getMonth() === month) {
    const k = toKey(cursor);
    if (k > limit) break;
    days.push(k);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Minutes between two "HH:MM" clock times, wrapping over midnight. */
export function minutesBetween(bed: string, wake: string): number | null {
  const parse = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  };
  const b = parse(bed);
  const w = parse(wake);
  if (b === null || w === null) return null;
  let diff = w - b;
  if (diff <= 0) diff += 1440;
  return diff;
}

/** 440 → "7h20" */
export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

/** 1428 → "23h48", for the median bedtime stat. */
export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}h${String(m % 60).padStart(2, "0")}`;
}
