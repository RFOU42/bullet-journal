import { formatDuration, minutesBetween } from "./dates";
import { MOOD_GLYPHS, MOOD_LABELS } from "./modules";
import type { DayEntry, ModuleId, Settings } from "./types";

/** Sleep duration in minutes, or null while the pair of times is incomplete. */
export function sleepMinutes(entry: DayEntry | undefined): number | null {
  if (!entry?.sleep?.bed || !entry.sleep.wake) return null;
  return minutesBetween(entry.sleep.bed, entry.sleep.wake);
}

/** Has this tracker been filled for this day? Drives the ✓ marks and the counter. */
export function isFilled(id: ModuleId, entry: DayEntry | undefined, settings: Settings): boolean {
  if (!entry) return false;
  switch (id) {
    case "sleep":
      return sleepMinutes(entry) !== null;
    case "mood":
      return typeof entry.mood === "number";
    case "pain":
      return typeof entry.pain?.value === "number";
    case "habits":
      return settings.habits.some((h) => entry.habits?.[h]);
    case "gratitude":
      return (entry.gratitude ?? []).some((g) => g.trim() !== "");
    case "activity":
      return typeof entry.activity?.minutes === "number" && entry.activity.minutes > 0;
    case "energy":
      return typeof entry.energy === "number";
    case "cycle":
      return typeof entry.cycle?.day === "number";
    default:
      return false;
  }
}

/** Short value shown on the tracker row and the summary card. */
export function summaryValue(id: ModuleId, entry: DayEntry | undefined, settings: Settings): string {
  if (!isFilled(id, entry, settings)) return "—";
  switch (id) {
    case "sleep": {
      const m = sleepMinutes(entry);
      return m === null ? "—" : formatDuration(m);
    }
    case "mood":
      return MOOD_GLYPHS[entry!.mood!] ?? "—";
    case "pain":
      return `${entry!.pain!.value} / 10`;
    case "habits": {
      const done = settings.habits.filter((h) => entry!.habits?.[h]).length;
      return `${done} / ${settings.habits.length}`;
    }
    case "gratitude": {
      const done = (entry!.gratitude ?? []).filter((g) => g.trim() !== "").length;
      return `${done} / 3`;
    }
    case "activity":
      return entry!.activity!.kind
        ? `${entry!.activity!.minutes} min — ${entry!.activity!.kind}`
        : `${entry!.activity!.minutes} min`;
    case "energy":
      return `${"●".repeat(entry!.energy!)}${"○".repeat(5 - entry!.energy!)}`;
    case "cycle":
      return `Jour ${entry!.cycle!.day}`;
    default:
      return "—";
  }
}

export function moodLabel(mood: number | undefined): string {
  return typeof mood === "number" ? MOOD_LABELS[mood] ?? "" : "";
}

/**
 * The mobile sleep wizard trades the 1–5 quality dots for three plain-language
 * buttons (agitée / correcte / reposante). Both write the same field, so
 * desktop stats stay meaningful regardless of which surface was used.
 */
export const SLEEP_FEEL_LABELS = ["agitée", "correcte", "reposante"] as const;
const SLEEP_FEEL_TO_QUALITY = [2, 3, 5];

export function qualityFromFeel(feel: 0 | 1 | 2): number {
  return SLEEP_FEEL_TO_QUALITY[feel];
}

export function feelFromQuality(quality: number | null | undefined): 0 | 1 | 2 | null {
  if (quality == null) return null;
  if (quality <= 2) return 0;
  if (quality === 3) return 1;
  return 2;
}

/* ---------- numeric series, shared by the weekly grid and the detail charts ---------- */

export interface SeriesPoint {
  key: string;
  value: number | null;
}

/**
 * A comparable daily number per tracker, plus the scale it is read against.
 * `binary` series are drawn as present/absent rather than sized.
 */
export function dailySeries(
  id: ModuleId,
  entries: Record<string, DayEntry>,
  days: string[],
  settings: Settings,
): { points: SeriesPoint[]; scale: number; binary: boolean } {
  const read = (key: string): number | null => {
    const e = entries[key];
    if (!isFilled(id, e, settings)) return null;
    switch (id) {
      case "sleep":
        return sleepMinutes(e);
      case "mood":
        return e!.mood! + 1;
      case "pain":
        return e!.pain!.value;
      case "habits":
        return settings.habits.filter((h) => e!.habits?.[h]).length;
      case "gratitude":
        return (e!.gratitude ?? []).filter((g) => g.trim() !== "").length;
      case "activity":
        return e!.activity!.minutes;
      case "energy":
        return e!.energy!;
      case "cycle":
        return e!.cycle!.day;
      default:
        return null;
    }
  };

  const points = days.map((key) => ({ key, value: read(key) }));
  const scales: Partial<Record<ModuleId, number>> = {
    mood: 4,
    pain: 10,
    habits: Math.max(1, settings.habits.length),
    gratitude: 3,
    energy: 5,
    sleep: 600,
    activity: 60,
  };
  const binary = id === "activity";
  return { points, scale: scales[id] ?? 1, binary };
}

/* ---------- sleep statistics, for the module detail screen ---------- */

export interface SleepStats {
  nights: number;
  averageMinutes: number | null;
  longNights: number;
  medianBedMinutes: number | null;
  averageQuality: number | null;
}

export function sleepStats(entries: Record<string, DayEntry>, days: string[], goalHours: number): SleepStats {
  const durations: number[] = [];
  const bedtimes: number[] = [];
  const qualities: number[] = [];

  for (const key of days) {
    const e = entries[key];
    const m = sleepMinutes(e);
    if (m === null) continue;
    durations.push(m);
    const bed = minutesBetween("00:00", e!.sleep!.bed);
    if (bed !== null) {
      // Fold late-evening bedtimes onto a continuous scale around midnight,
      // so 23h50 and 00h20 average to roughly midnight rather than midday.
      bedtimes.push(bed >= 720 ? bed - 1440 : bed);
    }
    if (typeof e!.sleep!.quality === "number") qualities.push(e!.sleep!.quality!);
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  const avg = mean(durations);
  const medBed = median(bedtimes);
  return {
    nights: durations.length,
    averageMinutes: avg === null ? null : Math.round(avg),
    longNights: durations.filter((m) => m >= goalHours * 60).length,
    medianBedMinutes: medBed === null ? null : Math.round(medBed),
    averageQuality: mean(qualities),
  };
}

/**
 * The "Croisements" panel. Counts short nights that were followed by a high pain
 * score — reported plainly, and only once there is something to report.
 */
export function shortNightPainOverlap(
  entries: Record<string, DayEntry>,
  days: string[],
): { short: number; withPain: number } | null {
  let short = 0;
  let withPain = 0;
  for (const key of days) {
    const e = entries[key];
    const m = sleepMinutes(e);
    if (m === null || m >= 360) continue;
    short += 1;
    if ((e!.pain?.value ?? 0) >= 6) withPain += 1;
  }
  return short === 0 ? null : { short, withPain };
}
