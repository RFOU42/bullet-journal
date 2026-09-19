import { useState } from "react";
import { isFilled, summaryValue } from "../lib/compute";
import { addDays, capitalise, formatShort, todayKey } from "../lib/dates";
import { MOMENTS } from "../lib/modules";
import { useDayReminder } from "../lib/useDayReminder";
import { useJournal } from "../state/JournalContext";
import type { Route } from "../lib/routes";
import type { ModuleId } from "../lib/types";

interface Props {
  onNavigate: (route: Route) => void;
}

/**
 * Design 7a — the fil du jour on a phone. Same accordion structure and day
 * navigation as 6a, but a row tap now opens the tracker's dedicated wizard
 * page (design 10) instead of expanding in place: there isn't room beside a
 * narrow row for an inline form, and the wizard's larger touch targets read
 * better here.
 */
export function MobileToday({ onNavigate }: Props) {
  const { filModules, entries, settings } = useJournal();
  const today = todayKey();
  const [dayKey, setDayKey] = useState(today);
  const entry = entries[dayKey];

  const missing = filModules.filter((m) => !isFilled(m.id, entry, settings));
  const filled = filModules.length - missing.length;
  const reminder = useDayReminder(today);

  const openWizard = (key: string, step: ModuleId) => onNavigate({ name: "wizard", dayKey: key, step });

  return (
    <main className="mtoday">
      <header className="mtoday-head">
        <div className="mtoday-headrow">
          <h1 className="serif" style={{ fontSize: 27, margin: 0 }}>
            Le fil du jour
          </h1>
          <span className="fil-count">
            {filled} / {filModules.length}
          </span>
        </div>

        <div className="mtoday-daynav">
          <button
            type="button"
            className="daynav-arrow"
            aria-label="Jour précédent"
            onClick={() => setDayKey(addDays(dayKey, -1))}
          >
            ‹
          </button>
          <span className="daynav-label">{capitalise(formatShort(dayKey))}</span>
          {dayKey !== today && (
            <button type="button" className="daynav-today" onClick={() => setDayKey(today)}>
              aujourd'hui
            </button>
          )}
          <button
            type="button"
            className="daynav-arrow"
            aria-label="Jour suivant"
            disabled={dayKey >= today}
            onClick={() => setDayKey(addDays(dayKey, 1))}
          >
            ›
          </button>
        </div>

        <div className="hand-sm" style={{ marginTop: 9 }}>
          {missing.length ? `${missing.map((m) => m.name).join(" · ")} — à remplir` : "journée complète"}
        </div>
      </header>

      <div className="mtoday-body dotted">
        {reminder && (
          <div className="banner" style={{ marginTop: 0, marginBottom: 16 }}>
            <span className="banner-dot" />
            <span className="banner-text">
              {capitalise(reminder.gaps.map((g) => g.name.toLowerCase()).join(", "))} non renseigné
              {reminder.gaps.length > 1 ? "s" : ""} — {formatShort(reminder.key)}
            </span>
            <button
              type="button"
              className="btn-link"
              onClick={() => openWizard(reminder.key, reminder.gaps[0].id)}
            >
              Compléter
            </button>
          </div>
        )}

        {MOMENTS.map(({ id: moment, label }) => {
          const mods = filModules.filter((m) => m.moment === moment);
          if (!mods.length) return null;
          return (
            <div key={moment}>
              <div className="moment-label">{label}</div>
              <div className="tracker-list">
                {mods.map((m) => {
                  const done = isFilled(m.id, entry, settings);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="mtracker"
                      style={{ borderLeftColor: m.color }}
                      onClick={() => openWizard(dayKey, m.id)}
                    >
                      <span
                        className={`tracker-mark ${done ? "done" : "todo"}`}
                        style={done ? undefined : { color: m.color }}
                      >
                        {done ? "✓" : ""}
                      </span>
                      <span className="mtracker-name">{m.name}</span>
                      <span className="tracker-value" style={{ fontSize: m.id === "mood" ? 18 : undefined }}>
                        {done ? summaryValue(m.id, entry, settings) : "à remplir"}
                      </span>
                      <span className="mtracker-chevron">›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filModules.length === 0 && (
          <div className="empty-note" style={{ marginTop: 20 }}>
            Aucun suivi sur cette page. Ajoute-en depuis Personnaliser.
          </div>
        )}
      </div>
    </main>
  );
}
