import { useMemo } from "react";
import { isFilled } from "./compute";
import { addDays } from "./dates";
import { useJournal } from "../state/JournalContext";
import type { ModuleDef } from "./types";

export interface DayReminder {
  key: string;
  gaps: ModuleDef[];
}

/**
 * The most recent earlier day that was started but left with a gap — the
 * "lundi 24 : douleur non renseignée" reminder that made the fil du jour win
 * over the guided sequence. Shared by the desktop and mobile "Aujourd'hui"
 * screens so both surface exactly the same nudge.
 */
export function useDayReminder(today: string): DayReminder | null {
  const { entries, filModules, settings } = useJournal();

  return useMemo(() => {
    for (let back = 1; back <= 14; back += 1) {
      const key = addDays(today, -back);
      const past = entries[key];
      // Only nag about days that were started; an untouched day is not a gap.
      if (!past) continue;
      const gaps = filModules.filter((m) => !isFilled(m.id, past, settings));
      if (gaps.length && gaps.length < filModules.length) return { key, gaps };
    }
    return null;
  }, [entries, filModules, settings, today]);
}
