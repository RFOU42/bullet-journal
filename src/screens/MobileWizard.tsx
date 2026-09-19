import { useMemo, useState } from "react";
import {
  feelFromQuality,
  qualityFromFeel,
  sleepMinutes,
  SLEEP_FEEL_LABELS,
} from "../lib/compute";
import { formatDuration, formatShort, todayKey } from "../lib/dates";
import { DEFAULT_HABITS, MOOD_GLYPHS, MOOD_LABELS, moduleDef } from "../lib/modules";
import { useJournal } from "../state/JournalContext";
import { SyncStatusLabel } from "../components/SyncStatusLabel";
import { TrackerEditor } from "../components/TrackerEditor";
import { buildWizardSteps, WIZARD_NEXT_LABEL } from "../lib/wizardSteps";
import type { DayEntry, ModuleId, Settings } from "../lib/types";

interface Props {
  dayKey: string;
  startStep: ModuleId;
  onExit: () => void;
  onCloseDay: () => void;
}

/** Design 10 — one full-screen page per tracker, "suivant" chaining through the rest of the day. */
export function MobileWizard({ dayKey, startStep, onExit, onCloseDay }: Props) {
  const { filModules, entries, updateEntry, settings, syncStatus } = useJournal();
  const entry = entries[dayKey];
  const isToday = dayKey === todayKey();

  const steps = useMemo(() => buildWizardSteps(filModules), [filModules]);
  const [index, setIndex] = useState(() => {
    const found = steps.findIndex((s) => s.trackers.includes(startStep));
    return found === -1 ? 0 : found;
  });

  if (steps.length === 0) {
    return (
      <main className="wizard">
        <WizardHead onExit={onExit} eyebrow="" dayLabel="" onSkip={null} />
        <div className="wizard-body dotted">
          <div className="empty-note">Aucun suivi actif pour aujourd'hui.</div>
        </div>
      </main>
    );
  }

  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;
  const dayLabel = isToday ? `aujourd'hui · ${formatShort(dayKey)}` : formatShort(dayKey);
  const eyebrow = `suivi ${index + 1} / ${steps.length}`;

  const advance = () => {
    if (isLast) onCloseDay();
    else setIndex((i) => i + 1);
  };

  const patch = (p: Partial<DayEntry>) => updateEntry(dayKey, p);

  return (
    <main className="wizard">
      <WizardHead onExit={onExit} eyebrow={eyebrow} color={step.color} dayLabel={dayLabel} onSkip={isLast ? null : advance} />
      <div className="wizard-body dotted">
        {step.key === "sleep" && <SleepPage entry={entry} patch={patch} />}
        {step.key === "mood" && <MoodPage entry={entry} patch={patch} />}
        {step.key === "pain" && <PainPage entry={entry} patch={patch} />}
        {step.key === "final" && <FinalPage trackers={step.trackers} entry={entry} settings={settings} patch={patch} />}
        {!["sleep", "mood", "pain", "final"].includes(step.key) && (
          <GenericPage id={step.trackers[0]} dayKey={dayKey} />
        )}

        <button type="button" className="btn btn-primary wizard-cta" onClick={advance}>
          {isLast ? "Clore la journée" : "Enregistrer et continuer"}
        </button>
        <div className="wizard-hint">
          {isLast ? (
            <SyncStatusLabel status={syncStatus} />
          ) : (
            `suivant : ${WIZARD_NEXT_LABEL[steps[index + 1]?.key] ?? moduleDef(steps[index + 1].trackers[0]).name.toLowerCase()}`
          )}
        </div>
      </div>
    </main>
  );
}

function WizardHead({
  onExit,
  eyebrow,
  color,
  dayLabel,
  onSkip,
}: {
  onExit: () => void;
  eyebrow: string;
  color?: string;
  dayLabel: string;
  onSkip: (() => void) | null;
}) {
  return (
    <div className="wizard-head">
      <button type="button" className="wizard-back" aria-label="Retour au fil du jour" onClick={onExit}>
        ‹
      </button>
      <div style={{ flex: 1 }}>
        <div className="eyebrow" style={{ color }}>
          {eyebrow}
        </div>
        <div className="wizard-daylabel">{dayLabel}</div>
      </div>
      {onSkip && (
        <button type="button" className="wizard-skip" onClick={onSkip}>
          Passer
        </button>
      )}
    </div>
  );
}

type Patch = (p: Partial<DayEntry>) => void;

function shiftTime(time: string | undefined, mins: number): string {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const t = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function SleepPage({ entry, patch }: { entry: DayEntry | undefined; patch: Patch }) {
  const sleep = entry?.sleep ?? { bed: "", wake: "" };
  const minutes = sleepMinutes(entry);
  const feel = feelFromQuality(sleep.quality);

  const stepBed = (mins: number) => patch({ sleep: { ...sleep, bed: shiftTime(sleep.bed, mins) } });
  const stepWake = (mins: number) => patch({ sleep: { ...sleep, wake: shiftTime(sleep.wake, mins) } });

  return (
    <>
      <h1 className="wizard-title">Comment as-tu dormi&nbsp;?</h1>
      <div className="hand" style={{ marginTop: 7 }}>les heures d'abord, le ressenti ensuite</div>

      <div className="wizard-steppers">
        <div className="wizard-stepper-card">
          <div className="field-label" style={{ marginBottom: 10 }}>couché</div>
          <div className="wizard-stepper-value">{sleep.bed || "—"}</div>
          <div className="wizard-stepper-btns">
            <button type="button" className="wizard-step-btn" aria-label="Coucher 15 minutes plus tôt" onClick={() => stepBed(-15)}>−</button>
            <button type="button" className="wizard-step-btn" aria-label="Coucher 15 minutes plus tard" onClick={() => stepBed(15)}>+</button>
          </div>
        </div>
        <div className="wizard-stepper-card">
          <div className="field-label" style={{ marginBottom: 10 }}>réveillé</div>
          <div className="wizard-stepper-value">{sleep.wake || "—"}</div>
          <div className="wizard-stepper-btns">
            <button type="button" className="wizard-step-btn" aria-label="Réveil 15 minutes plus tôt" onClick={() => stepWake(-15)}>−</button>
            <button type="button" className="wizard-step-btn" aria-label="Réveil 15 minutes plus tard" onClick={() => stepWake(15)}>+</button>
          </div>
        </div>
      </div>

      <div className="wizard-duration">
        <span className="serif" style={{ fontSize: 34 }}>{minutes === null ? "—" : formatDuration(minutes)}</span>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>de sommeil</span>
      </div>

      <div className="hand-sm" style={{ margin: "24px 0 10px 2px" }}>la nuit était</div>
      <div className="wizard-choices">
        {SLEEP_FEEL_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`wizard-choice${feel === i ? " selected" : ""}`}
            aria-pressed={feel === i}
            onClick={() => patch({ sleep: { ...sleep, quality: qualityFromFeel(i as 0 | 1 | 2) } })}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

function MoodPage({ entry, patch }: { entry: DayEntry | undefined; patch: Patch }) {
  return (
    <>
      <h1 className="wizard-title">Comment tu te sens ce matin&nbsp;?</h1>
      <div className="hand" style={{ marginTop: 7 }}>un ressenti suffit, tu détailleras si besoin</div>

      <div className="wizard-mood-row">
        {MOOD_GLYPHS.map((glyph, k) => (
          <button
            key={glyph}
            type="button"
            className={`wizard-mood-key${entry?.mood === k ? " selected" : ""}`}
            aria-label={MOOD_LABELS[k]}
            aria-pressed={entry?.mood === k}
            onClick={() => patch({ mood: k })}
          >
            {glyph}
          </button>
        ))}
      </div>
      {typeof entry?.mood === "number" && (
        <div className="hand" style={{ marginTop: 16, textAlign: "center" }}>{MOOD_LABELS[entry.mood]}</div>
      )}
    </>
  );
}

const PAIN_ZONES = ["bas du dos", "nuque", "ventre", "tête", "articulations"];

function PainPage({ entry, patch }: { entry: DayEntry | undefined; patch: Patch }) {
  const pain = entry?.pain;
  const zones = pain?.zones ?? [];

  const caption =
    pain?.value == null
      ? "rien noté pour l'instant"
      : pain.value === 0
        ? "aucune douleur"
        : pain.value <= 3
          ? "gênant mais supportable"
          : pain.value <= 6
            ? "présent toute la journée"
            : "difficile à ignorer";

  return (
    <>
      <h1 className="wizard-title">Où en est la douleur&nbsp;?</h1>
      <div className="hand" style={{ marginTop: 7 }}>{caption}</div>

      <div className="wizard-pain-grid">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            className={`wizard-pain-key${pain?.value === n ? " selected" : ""}`}
            aria-pressed={pain?.value === n}
            onClick={() => patch({ pain: { value: n, note: pain?.note, zones: pain?.zones } })}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="wizard-pain-scale">
        <span>aucune</span>
        <span>insupportable</span>
      </div>

      <div className="hand-sm" style={{ margin: "24px 0 10px 2px" }}>où ça&nbsp;?</div>
      <div className="wizard-zones">
        {PAIN_ZONES.map((zone) => {
          const on = zones.includes(zone);
          return (
            <button
              key={zone}
              type="button"
              className={`wizard-zone${on ? " selected" : ""}`}
              aria-pressed={on}
              onClick={() =>
                patch({
                  pain: {
                    value: pain?.value ?? 0,
                    note: pain?.note,
                    zones: on ? zones.filter((z) => z !== zone) : [...zones, zone],
                  },
                })
              }
            >
              {zone}
            </button>
          );
        })}
      </div>

      <div className="hand-sm" style={{ margin: "24px 0 8px 2px" }}>une précision&nbsp;?</div>
      <input
        className="input wizard-input"
        placeholder="mieux le soir, après les étirements…"
        value={pain?.note ?? ""}
        onChange={(e) => patch({ pain: { value: pain?.value ?? 0, zones: pain?.zones, note: e.target.value } })}
      />
    </>
  );
}

function FinalPage({
  trackers,
  entry,
  settings,
  patch,
}: {
  trackers: ModuleId[];
  entry: DayEntry | undefined;
  settings: Settings;
  patch: Patch;
}) {
  const hasHabits = trackers.includes("habits");
  const hasGratitude = trackers.includes("gratitude");
  const habits = entry?.habits ?? {};
  const habitList = settings.habits.length ? settings.habits : DEFAULT_HABITS;
  const gratitude = entry?.gratitude ?? ["", "", ""];
  const doneCount = habitList.filter((h) => habits[h]).length;

  return (
    <>
      <h1 className="wizard-title">
        {hasHabits && hasGratitude ? "La journée, en deux gestes" : hasHabits ? "Qu'as-tu tenu aujourd'hui ?" : "Trois choses pour aujourd'hui"}
      </h1>
      <div className="hand" style={{ marginTop: 7 }}>
        {hasHabits ? `${doneCount} / ${habitList.length} cochées` : "un mot suffit"}
      </div>

      {hasHabits && (
        <div className="wizard-habits">
          {habitList.map((label) => {
            const on = !!habits[label];
            return (
              <button
                key={label}
                type="button"
                className={`wizard-habit${on ? " selected" : ""}`}
                aria-pressed={on}
                onClick={() => patch({ habits: { ...habits, [label]: !on } })}
              >
                <span className={`checkbox${on ? " on" : ""}`} style={on ? { background: "var(--sage)" } : undefined}>
                  {on ? "✓" : ""}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {hasGratitude && (
        <>
          <div className="hand-sm" style={{ margin: "26px 0 12px 2px" }}>trois choses pour aujourd'hui</div>
          <div className="wizard-grat">
            {[0, 1, 2].map((k) => (
              <span className="wizard-grat-line" key={k}>
                <span className="grat-n">{k + 1}.</span>
                <input
                  className="wizard-grat-input"
                  aria-label={`Gratitude ${k + 1}`}
                  placeholder="…"
                  value={gratitude[k] ?? ""}
                  onChange={(e) => {
                    const next = [gratitude[0] ?? "", gratitude[1] ?? "", gratitude[2] ?? ""];
                    next[k] = e.target.value;
                    patch({ gratitude: next });
                  }}
                />
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Any tracker without a bespoke mobile page (activity, energy, cycle…) still gets the wizard's chrome. */
function GenericPage({ id, dayKey }: { id: ModuleId; dayKey: string }) {
  const { entries } = useJournal();
  const mod = moduleDef(id);
  return (
    <>
      <h1 className="wizard-title">{mod.name}</h1>
      <div className="wizard-generic-body">
        <TrackerEditor id={id} dayKey={dayKey} entry={entries[dayKey]} color={mod.color} />
      </div>
    </>
  );
}
