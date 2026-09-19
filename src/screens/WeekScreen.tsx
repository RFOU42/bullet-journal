import { useState } from "react";
import { dailySeries } from "../lib/compute";
import {
  addDays,
  formatDayMonth,
  formatWeekdayShort,
  isoWeekNumber,
  startOfWeek,
  todayKey,
  weekDays,
} from "../lib/dates";
import { C, PAIN_SHADES } from "../lib/modules";
import { useJournal } from "../state/JournalContext";

/**
 * The paper carnet's weekly grid: one row per tracker in its domain colour,
 * one dot per day sized by intensity. Pain gets a light-to-dark ramp instead of
 * a size, so a bad day reads as darker rather than bigger.
 */
export function WeekScreen() {
  const { activeModules, entries, settings } = useJournal();
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const days = weekDays(weekStart);

  // Every tracker, whichever page it lives on, belongs in the week's overview.
  const rows = activeModules.filter((m) => m.kind === "tracker");

  return (
    <main className="main">
      <header className="screen-head">
        <div>
          <div className="eyebrow">semaine {isoWeekNumber(weekStart)}</div>
          <h1 className="screen-title" style={{ marginTop: 9 }}>
            {formatDayMonth(days[0])} → {formatDayMonth(days[6])}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost" aria-label="Semaine précédente" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ←
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Semaine suivante"
            disabled={addDays(weekStart, 7) > today}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            →
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setWeekStart(startOfWeek(today))}>
            Cette semaine
          </button>
        </div>
      </header>

      <hr className="rule" />

      <div className="week-panel">
        <div className="week-grid-head">
          <span />
          {days.map((key) => (
            <span key={key} className={key === today ? "today-col" : undefined}>
              {formatWeekdayShort(key)}
            </span>
          ))}
        </div>

        {rows.length === 0 && <div className="empty-note" style={{ margin: 16 }}>Aucun suivi actif.</div>}

        {rows.map((mod) => {
          const { points, scale, binary } = dailySeries(mod.id, entries, days, settings);
          return (
            <div className="week-row" key={mod.id}>
              <span className="week-row-label">{mod.id === "pain" ? "Douleur (intensité)" : mod.name}</span>
              {points.map((p) => {
                const isToday = p.key === today;
                const filled = p.value !== null && p.value > 0;
                const ratio = p.value === null ? 0 : Math.min(1, p.value / scale);

                // Pain: fixed size, colour carries the intensity. Others: fixed
                // colour, size carries it.
                const size = mod.id === "pain" ? 15 : binary ? 15 : filled ? 10 + Math.round(ratio * 11) : 11;
                const background =
                  mod.id === "pain"
                    ? p.value === null
                      ? C.rule
                      : PAIN_SHADES[Math.min(PAIN_SHADES.length - 1, Math.round(ratio * (PAIN_SHADES.length - 1)))]
                    : filled
                      ? mod.color
                      : C.rule;

                return (
                  <span key={p.key} className={`week-cell${isToday ? " today" : ""}`}>
                    <span
                      className="week-mark"
                      title={p.value === null ? "non renseigné" : String(p.value)}
                      style={{
                        width: size,
                        height: size,
                        background,
                        boxShadow: isToday && filled ? "0 0 0 2px rgba(61,90,128,.35)" : "none",
                      }}
                    />
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="week-legend">
        <span>
          <span className="week-mark" style={{ width: 11, height: 11, background: C.rose }} />
          <span className="week-mark" style={{ width: 11, height: 11, background: C.sage }} />
          rempli — couleur du domaine, taille = intensité
        </span>
        <span>
          <span className="week-mark" style={{ width: 11, height: 11, background: C.rule }} />
          vide
        </span>
        <span className="hand-sm">la colonne teintée, c'est aujourd'hui</span>
      </div>
    </main>
  );
}
