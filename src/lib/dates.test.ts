import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  capitalise,
  formatClock,
  formatDayMonth,
  formatDuration,
  formatLong,
  formatMonth,
  formatShort,
  formatWeekdayShort,
  fromKey,
  isoWeekNumber,
  minutesBetween,
  monthDaysUpTo,
  startOfWeek,
  toKey,
  todayKey,
  weekDays,
} from "./dates";

describe("toKey / fromKey", () => {
  it("formats a Date as YYYY-MM-DD, zero-padded", () => {
    expect(toKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("round-trips through fromKey without drifting a day", () => {
    for (const key of ["2026-01-01", "2026-02-28", "2026-12-31", "2024-02-29"]) {
      expect(toKey(fromKey(key))).toBe(key);
    }
  });
});

describe("todayKey", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reflects the system clock", () => {
    vi.setSystemTime(new Date(2026, 8, 16, 23, 59));
    expect(todayKey()).toBe("2026-09-16");
  });
});

describe("addDays", () => {
  it("moves forward and backward", () => {
    expect(addDays("2026-08-25", 1)).toBe("2026-08-26");
    expect(addDays("2026-08-25", -1)).toBe("2026-08-24");
    expect(addDays("2026-08-25", 0)).toBe("2026-08-25");
  });

  it("crosses a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day correctly", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    // 2026 is not a leap year.
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("minutesBetween", () => {
  it("computes a same-day span", () => {
    expect(minutesBetween("07:00", "07:20")).toBe(20);
    expect(minutesBetween("00:00", "01:00")).toBe(60);
  });

  it("wraps a span crossing midnight", () => {
    expect(minutesBetween("23:40", "07:00")).toBe(440); // 7h20
    expect(minutesBetween("23:00", "23:30")).toBe(30);
  });

  it("treats an identical bed/wake time as a full 24h wrap, not zero", () => {
    // The function's own rule: diff <= 0 wraps by 1440 — a 0-length night
    // reads as "not filled in yet" elsewhere, but the arithmetic itself must
    // stay this way for anything that does call it with equal times.
    expect(minutesBetween("07:00", "07:00")).toBe(1440);
  });

  it("returns null for malformed or out-of-range input", () => {
    expect(minutesBetween("", "07:00")).toBeNull();
    expect(minutesBetween("7:00", "07:00")).not.toBeNull(); // single-digit hour is valid
    expect(minutesBetween("24:00", "07:00")).toBeNull();
    expect(minutesBetween("07:60", "08:00")).toBeNull();
    expect(minutesBetween("not-a-time", "08:00")).toBeNull();
  });
});

describe("formatDuration / formatClock", () => {
  it("formats minutes as Nh MM", () => {
    expect(formatDuration(440)).toBe("7h20");
    expect(formatDuration(60)).toBe("1h00");
    expect(formatDuration(5)).toBe("0h05");
  });

  it("formats a clock position, wrapping negative/overflowing minutes", () => {
    expect(formatClock(1428)).toBe("23h48");
    expect(formatClock(0)).toBe("00h00");
    expect(formatClock(-30)).toBe("23h30");
    expect(formatClock(1440 + 30)).toBe("00h30");
  });
});

describe("capitalise", () => {
  it("upper-cases only the first character", () => {
    expect(capitalise("mardi 25 août")).toBe("Mardi 25 août");
    expect(capitalise("")).toBe("");
  });
});

describe("startOfWeek / weekDays", () => {
  it("finds the Monday of the week for any weekday", () => {
    expect(startOfWeek("2026-08-25")).toBe("2026-08-24"); // Tuesday -> Monday
    expect(startOfWeek("2026-08-24")).toBe("2026-08-24"); // Monday -> itself
    expect(startOfWeek("2026-08-30")).toBe("2026-08-24"); // Sunday -> previous Monday
  });

  it("lists exactly seven consecutive days starting on the given key", () => {
    const days = weekDays("2026-08-24");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-24");
    expect(days[6]).toBe("2026-08-30");
  });
});

describe("isoWeekNumber", () => {
  it("matches known ISO week numbers", () => {
    expect(isoWeekNumber("2026-08-24")).toBe(35);
    expect(isoWeekNumber("2026-01-01")).toBe(1);
  });
});

describe("monthDaysUpTo", () => {
  it("lists every day of the month up to the limit, inclusive", () => {
    const days = monthDaysUpTo("2026-02-10", "2026-02-10");
    expect(days[0]).toBe("2026-02-01");
    expect(days.at(-1)).toBe("2026-02-10");
    expect(days).toHaveLength(10);
  });

  it("stops at month end when the limit is later", () => {
    const days = monthDaysUpTo("2026-02-10", "2026-03-31");
    expect(days.at(-1)).toBe("2026-02-28");
  });
});

describe("locale formatters", () => {
  it("produce non-empty French output for a stable date", () => {
    expect(formatLong("2026-08-25")).toContain("25");
    expect(formatShort("2026-08-25")).not.toMatch(/\.$/); // trailing "mar." dot stripped
    expect(formatDayMonth("2026-08-25")).toBe("25 août");
    expect(formatMonth("2026-08-25")).toContain("2026");
    expect(formatWeekdayShort("2026-08-24")).toMatch(/^\S+ 24$/);
  });
});
