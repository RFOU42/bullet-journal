import { describe, expect, it } from "vitest";
import {
  dailySeries,
  feelFromQuality,
  isFilled,
  moodLabel,
  qualityFromFeel,
  shortNightPainOverlap,
  sleepMinutes,
  sleepStats,
  summaryValue,
} from "./compute";
import { defaultSettings } from "./storage";
import type { DayEntry, Settings } from "./types";

const settings: Settings = defaultSettings();

describe("sleepMinutes", () => {
  it("is null until both bed and wake are set", () => {
    expect(sleepMinutes(undefined)).toBeNull();
    expect(sleepMinutes({})).toBeNull();
    expect(sleepMinutes({ sleep: { bed: "23:00", wake: "" } })).toBeNull();
  });

  it("computes the duration once both are set, wrapping midnight", () => {
    expect(sleepMinutes({ sleep: { bed: "23:40", wake: "07:00" } })).toBe(440);
  });
});

describe("isFilled", () => {
  it("is false for every tracker on an empty day", () => {
    for (const id of ["sleep", "mood", "pain", "habits", "gratitude", "activity", "energy", "cycle"] as const) {
      expect(isFilled(id, undefined, settings)).toBe(false);
      expect(isFilled(id, {}, settings)).toBe(false);
    }
  });

  it("mood is filled by 0 (a falsy but valid value), not just truthy moods", () => {
    expect(isFilled("mood", { mood: 0 }, settings)).toBe(true);
  });

  it("habits needs at least one true entry among the tracked habits", () => {
    const entry: DayEntry = { habits: { "Une autre habitude": true } };
    expect(isFilled("habits", entry, settings)).toBe(false); // not one of settings.habits
    expect(isFilled("habits", { habits: { [settings.habits[0]]: true } }, settings)).toBe(true);
  });

  it("gratitude needs at least one non-blank line", () => {
    expect(isFilled("gratitude", { gratitude: ["", "  ", ""] }, settings)).toBe(false);
    expect(isFilled("gratitude", { gratitude: ["", "un café", ""] }, settings)).toBe(true);
  });

  it("activity needs a positive duration, not just a defined one", () => {
    expect(isFilled("activity", { activity: { minutes: 0 } }, settings)).toBe(false);
    expect(isFilled("activity", { activity: { minutes: 30 } }, settings)).toBe(true);
  });
});

describe("summaryValue", () => {
  it("falls back to an em dash when not filled", () => {
    expect(summaryValue("pain", undefined, settings)).toBe("—");
  });

  it("formats each tracker's short value", () => {
    expect(summaryValue("sleep", { sleep: { bed: "23:40", wake: "07:00" } }, settings)).toBe("7h20");
    expect(summaryValue("pain", { pain: { value: 4 } }, settings)).toBe("4 / 10");
    expect(summaryValue("mood", { mood: 2 }, settings)).toBe("🙂");
    expect(
      summaryValue("habits", { habits: { [settings.habits[0]]: true, [settings.habits[1]]: true } }, settings),
    ).toBe(`2 / ${settings.habits.length}`);
    expect(summaryValue("gratitude", { gratitude: ["a", "b", ""] }, settings)).toBe("2 / 3");
    expect(summaryValue("activity", { activity: { minutes: 30, kind: "Marche" } }, settings)).toBe("30 min — Marche");
    expect(summaryValue("activity", { activity: { minutes: 30 } }, settings)).toBe("30 min");
    expect(summaryValue("energy", { energy: 3 }, settings)).toBe("●●●○○");
    expect(summaryValue("cycle", { cycle: { day: 14 } }, settings)).toBe("Jour 14");
  });
});

describe("moodLabel", () => {
  it("maps an index to its French label, and is blank for none", () => {
    expect(moodLabel(2)).toBe("plutôt bien");
    expect(moodLabel(undefined)).toBe("");
  });
});

describe("quality <-> feel mapping (desktop dots vs. mobile wizard choice)", () => {
  it("round-trips through the same bucket", () => {
    for (const feel of [0, 1, 2] as const) {
      const quality = qualityFromFeel(feel);
      expect(feelFromQuality(quality)).toBe(feel);
    }
  });

  it("buckets every 1-5 quality value into exactly one feel", () => {
    expect(feelFromQuality(1)).toBe(0);
    expect(feelFromQuality(2)).toBe(0);
    expect(feelFromQuality(3)).toBe(1);
    expect(feelFromQuality(4)).toBe(2);
    expect(feelFromQuality(5)).toBe(2);
    expect(feelFromQuality(null)).toBeNull();
    expect(feelFromQuality(undefined)).toBeNull();
  });
});

describe("dailySeries", () => {
  const days = ["2026-08-24", "2026-08-25"];

  it("reads null for days without an entry, a value for filled ones", () => {
    const entries: Record<string, DayEntry> = { "2026-08-25": { pain: { value: 6 } } };
    const { points, scale, binary } = dailySeries("pain", entries, days, settings);
    expect(points).toEqual([
      { key: "2026-08-24", value: null },
      { key: "2026-08-25", value: 6 },
    ]);
    expect(scale).toBe(10);
    expect(binary).toBe(false);
  });

  it("flags activity as the one binary series", () => {
    const entries: Record<string, DayEntry> = { "2026-08-24": { activity: { minutes: 20 } } };
    const { binary } = dailySeries("activity", entries, days, settings);
    expect(binary).toBe(true);
  });

  it("scales the habits series to however many habits are tracked", () => {
    const custom: Settings = { ...settings, habits: ["A", "B", "C", "D"] };
    const { scale } = dailySeries("habits", {}, days, custom);
    expect(scale).toBe(4);
  });
});

describe("sleepStats", () => {
  const days = ["2026-08-24", "2026-08-25", "2026-08-26"];

  it("returns nulls with zero nights when nothing is filled in", () => {
    const stats = sleepStats({}, days, 7.5);
    expect(stats).toEqual({
      nights: 0,
      averageMinutes: null,
      longNights: 0,
      medianBedMinutes: null,
      averageQuality: null,
    });
  });

  it("averages duration, counts nights meeting the goal, and averages quality", () => {
    const entries: Record<string, DayEntry> = {
      "2026-08-24": { sleep: { bed: "23:00", wake: "07:00", quality: 4 } }, // 8h00
      "2026-08-25": { sleep: { bed: "01:00", wake: "06:00", quality: 2 } }, // 5h00
    };
    const stats = sleepStats(entries, days, 7);
    expect(stats.nights).toBe(2);
    expect(stats.averageMinutes).toBe(390); // (480 + 300) / 2
    expect(stats.longNights).toBe(1); // only the 8h00 night clears a 7h goal
    expect(stats.averageQuality).toBe(3);
  });
});

describe("shortNightPainOverlap", () => {
  it("is null when there are no short nights to report on", () => {
    expect(shortNightPainOverlap({}, ["2026-08-24"])).toBeNull();
  });

  it("counts short nights (<6h) and how many coincide with high pain", () => {
    const entries: Record<string, DayEntry> = {
      "2026-08-24": { sleep: { bed: "01:00", wake: "06:00" }, pain: { value: 7 } }, // 5h, high pain
      "2026-08-25": { sleep: { bed: "02:00", wake: "06:00" }, pain: { value: 2 } }, // 4h, low pain
      "2026-08-26": { sleep: { bed: "22:00", wake: "07:00" }, pain: { value: 8 } }, // 9h, not short
    };
    expect(shortNightPainOverlap(entries, Object.keys(entries))).toEqual({ short: 2, withPain: 1 });
  });
});
