import { isFilled, summaryValue } from "../lib/compute";
import { formatShort, todayKey } from "../lib/dates";
import { MOMENTS } from "../lib/modules";
import { useJournal } from "../state/JournalContext";
import { SyncStatusLabel } from "./SyncStatusLabel";
import { TrackerEditor } from "./TrackerEditor";
import type { ModuleId } from "../lib/types";

interface Props {
  dayKey: string;
  openTracker: ModuleId | null;
  onOpenTracker: (id: ModuleId | null) => void;
  onChangeDay: (key: string) => void;
  onStepDay: (delta: number) => void;
  canGoForward: boolean;
  /** "Clore la journée" — folds the trackers away and moves on to the week. */
  onCloseDay: () => void;
}

/**
 * The right-hand rail: every tracker for the day, grouped by moment, each one
 * opening in place. Nothing has to be filled in order — that was the point of
 * the "fil du jour" over the guided sequence.
 */
export function DayFil({
  dayKey,
  openTracker,
  onOpenTracker,
  onChangeDay,
  onStepDay,
  canGoForward,
  onCloseDay,
}: Props) {
  const { filModules, entries, settings, syncStatus } = useJournal();
  const entry = entries[dayKey];
  const today = todayKey();

  const filled = filModules.filter((m) => isFilled(m.id, entry, settings)).length;

  return (
    <aside className="fil">
      <div>
        <div className="fil-head">
          <span className="fil-title">le fil du jour</span>
          <span className="fil-count">
            {filled} / {filModules.length} remplis
          </span>
        </div>

        <div className="daynav">
          <button type="button" className="daynav-arrow" aria-label="Jour précédent" onClick={() => onStepDay(-1)}>
            ‹
          </button>
          <span className="daynav-label">{formatShort(dayKey)}</span>
          <button
            type="button"
            className="daynav-arrow"
            aria-label="Jour suivant"
            disabled={!canGoForward}
            onClick={() => onStepDay(1)}
          >
            ›
          </button>
          {dayKey !== today && (
            <button type="button" className="daynav-today" onClick={() => onChangeDay(today)}>
              aujourd'hui
            </button>
          )}
        </div>

        {MOMENTS.map(({ id: moment, label }) => {
          const mods = filModules.filter((m) => m.moment === moment);
          if (!mods.length) return null;
          return (
            <div key={moment}>
              <div className="moment-label">{label}</div>
              <div className="tracker-list">
                {mods.map((m) => {
                  const open = openTracker === m.id;
                  const done = isFilled(m.id, entry, settings);
                  return (
                    <div
                      key={m.id}
                      className={`tracker${open ? " open" : ""}`}
                      style={{ borderLeftColor: m.color }}
                    >
                      <button
                        type="button"
                        className="tracker-head"
                        aria-expanded={open}
                        onClick={() => onOpenTracker(open ? null : m.id)}
                      >
                        <span
                          className={`tracker-mark ${done ? "done" : "todo"}`}
                          style={done ? undefined : { color: m.color }}
                        >
                          {done ? "✓" : ""}
                        </span>
                        <span className="tracker-name">{m.name}</span>
                        <span className="tracker-value" style={{ fontSize: m.id === "mood" ? 15 : undefined }}>
                          {done ? summaryValue(m.id, entry, settings) : "à remplir"}
                        </span>
                      </button>
                      {open && (
                        <div className="tracker-body">
                          <TrackerEditor id={m.id} dayKey={dayKey} entry={entry} color={m.color} />
                        </div>
                      )}
                    </div>
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

      <div className="fil-foot">
        <SyncStatusLabel status={syncStatus} />
        <button type="button" className="btn btn-primary" onClick={onCloseDay}>
          Clore la journée
        </button>
      </div>
    </aside>
  );
}
