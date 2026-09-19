import { formatDuration } from "../lib/dates";
import { moodLabel, sleepMinutes } from "../lib/compute";
import { MOOD_GLYPHS } from "../lib/modules";
import { useJournal } from "../state/JournalContext";
import type { DayEntry, ModuleId } from "../lib/types";

interface Props {
  id: ModuleId;
  dayKey: string;
  entry: DayEntry | undefined;
  color: string;
}

/** The body revealed when a tracker row is opened in the fil du jour. */
export function TrackerEditor({ id, dayKey, entry, color }: Props) {
  const { updateEntry, settings, setSettings } = useJournal();
  const patch = (p: Partial<DayEntry>) => updateEntry(dayKey, p);

  switch (id) {
    case "sleep": {
      const sleep = entry?.sleep ?? { bed: "", wake: "" };
      const minutes = sleepMinutes(entry);
      return (
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label>
              <div className="field-label">couché</div>
              <input
                className="input input-time"
                type="time"
                value={sleep.bed}
                onChange={(e) => patch({ sleep: { ...sleep, bed: e.target.value } })}
              />
            </label>
            <span style={{ color: "var(--faint)", paddingBottom: 8 }}>→</span>
            <label>
              <div className="field-label">réveillé</div>
              <input
                className="input input-time"
                type="time"
                value={sleep.wake}
                onChange={(e) => patch({ sleep: { ...sleep, wake: e.target.value } })}
              />
            </label>
            <div style={{ paddingBottom: 7, font: "400 18px/1 var(--serif)" }}>
              {minutes === null ? "—" : formatDuration(minutes)}
            </div>
          </div>
          <div className="dots-row" style={{ marginTop: 12 }}>
            <span className="field-label" style={{ marginBottom: 0, marginRight: 4 }}>
              qualité
            </span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="dot-key"
                aria-label={`Qualité ${n} sur 5`}
                aria-pressed={sleep.quality === n}
                style={
                  (sleep.quality ?? 0) >= n ? { background: color, borderColor: color } : undefined
                }
                onClick={() => patch({ sleep: { ...sleep, quality: sleep.quality === n ? null : n } })}
              />
            ))}
          </div>
          <input
            className="input-line"
            placeholder="une note sur la nuit ?"
            value={sleep.note ?? ""}
            onChange={(e) => patch({ sleep: { ...sleep, note: e.target.value } })}
          />
        </div>
      );
    }

    case "mood":
      return (
        <div>
          <div className="mood-row">
            {MOOD_GLYPHS.map((glyph, k) => (
              <button
                key={glyph}
                type="button"
                className={`mood-key${entry?.mood === k ? " selected" : ""}`}
                aria-label={`Humeur : ${moodLabel(k)}`}
                aria-pressed={entry?.mood === k}
                style={entry?.mood === k ? { background: color, boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
                onClick={() => patch({ mood: entry?.mood === k ? undefined : k })}
              >
                {glyph}
              </button>
            ))}
          </div>
          {typeof entry?.mood === "number" && (
            <div className="hand" style={{ marginTop: 10 }}>
              {moodLabel(entry.mood)}
            </div>
          )}
        </div>
      );

    case "pain": {
      const pain = entry?.pain;
      return (
        <div>
          <div className="pad">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                className={`pad-key${pain?.value === n ? " selected" : ""}`}
                aria-label={`Douleur ${n} sur 10`}
                aria-pressed={pain?.value === n}
                style={pain?.value === n ? { background: color } : undefined}
                onClick={() =>
                  patch({ pain: pain?.value === n ? undefined : { ...pain, value: n } })
                }
              >
                {n}
              </button>
            ))}
          </div>
          <input
            className="input-line"
            placeholder="une précision ?"
            value={pain?.note ?? ""}
            onChange={(e) => patch({ pain: { value: pain?.value ?? 0, note: e.target.value } })}
          />
        </div>
      );
    }

    case "habits": {
      const habits = entry?.habits ?? {};
      const addHabit = () => {
        const label = window.prompt("Nouvelle habitude")?.trim();
        if (!label || settings.habits.includes(label)) return;
        setSettings({ habits: [...settings.habits, label] });
      };
      return (
        <div className="stack">
          {settings.habits.map((label) => {
            const on = !!habits[label];
            return (
              <button
                key={label}
                type="button"
                className={`check-row${on ? "" : " off"}`}
                aria-pressed={on}
                onClick={() => patch({ habits: { ...habits, [label]: !on } })}
              >
                <span
                  className={`checkbox${on ? " on" : ""}`}
                  style={on ? { background: color } : undefined}
                >
                  {on ? "✓" : ""}
                </span>
                {label}
              </button>
            );
          })}
          <button type="button" className="btn-link" style={{ alignSelf: "flex-start" }} onClick={addHabit}>
            + ajouter une habitude
          </button>
        </div>
      );
    }

    case "gratitude": {
      const items = entry?.gratitude ?? ["", "", ""];
      return (
        <div className="stack">
          {[0, 1, 2].map((k) => (
            <span className="grat-line" key={k}>
              <span className="grat-n">{k + 1}.</span>
              <input
                className="input-line"
                style={{ flex: 1 }}
                aria-label={`Gratitude ${k + 1}`}
                value={items[k] ?? ""}
                onChange={(e) => {
                  const next = [items[0] ?? "", items[1] ?? "", items[2] ?? ""];
                  next[k] = e.target.value;
                  patch({ gratitude: next });
                }}
              />
            </span>
          ))}
        </div>
      );
    }

    case "activity": {
      const activity = entry?.activity;
      return (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label>
            <div className="field-label">durée (min)</div>
            <input
              className="input"
              style={{ width: 74 }}
              type="number"
              min={0}
              value={activity?.minutes ?? ""}
              onChange={(e) =>
                patch({
                  activity: e.target.value === ""
                    ? undefined
                    : { ...activity, minutes: Number(e.target.value) },
                })
              }
            />
          </label>
          <label style={{ flex: 1, minWidth: 120 }}>
            <div className="field-label">quoi ?</div>
            <input
              className="input"
              style={{ width: "100%" }}
              placeholder="marche, vélo…"
              value={activity?.kind ?? ""}
              onChange={(e) => patch({ activity: { minutes: activity?.minutes ?? 0, kind: e.target.value } })}
            />
          </label>
        </div>
      );
    }

    case "energy":
      return (
        <div className="dots-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="dot-key"
              aria-label={`Énergie ${n} sur 5`}
              aria-pressed={entry?.energy === n}
              style={(entry?.energy ?? 0) >= n ? { background: color, borderColor: color } : undefined}
              onClick={() => patch({ energy: entry?.energy === n ? undefined : n })}
            />
          ))}
        </div>
      );

    case "cycle": {
      const cycle = entry?.cycle;
      return (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label>
            <div className="field-label">jour du cycle</div>
            <input
              className="input"
              style={{ width: 74 }}
              type="number"
              min={1}
              value={cycle?.day ?? ""}
              onChange={(e) =>
                patch({
                  cycle: e.target.value === ""
                    ? undefined
                    : { ...cycle, day: Number(e.target.value) },
                })
              }
            />
          </label>
          <label style={{ flex: 1, minWidth: 120 }}>
            <div className="field-label">note</div>
            <input
              className="input"
              style={{ width: "100%" }}
              value={cycle?.flow ?? ""}
              onChange={(e) => patch({ cycle: { day: cycle?.day ?? null, flow: e.target.value } })}
            />
          </label>
        </div>
      );
    }

    default:
      return null;
  }
}
