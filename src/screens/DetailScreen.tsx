import { useMemo, useState } from "react";
import { dailySeries, shortNightPainOverlap, sleepMinutes, sleepStats, summaryValue } from "../lib/compute";
import {
  formatClock,
  formatDayMonth,
  formatDuration,
  formatMonth,
  fromKey,
  monthDaysUpTo,
  startOfWeek,
  todayKey,
  toKey,
  weekDays,
} from "../lib/dates";
import { moduleDef } from "../lib/modules";
import { useJournal } from "../state/JournalContext";
import type { ModuleId } from "../lib/types";

type Range = "week" | "month" | "year";

/** One column of the chart: a day for short ranges, a month for the year view. */
interface Bar {
  key: string;
  label: string;
  value: number | null;
  isToday: boolean;
}

interface Props {
  moduleId: ModuleId;
  onBack: () => void;
}

export function DetailScreen({ moduleId, onBack }: Props) {
  const { entries, settings } = useJournal();
  const mod = moduleDef(moduleId);
  const [range, setRange] = useState<Range>("month");
  const today = todayKey();

  const days = useMemo(() => {
    if (range === "week") return weekDays(startOfWeek(today));
    if (range === "month") return monthDaysUpTo(today, today);
    // A rolling year, aggregated into months below so the chart stays readable.
    const start = fromKey(today);
    start.setMonth(start.getMonth() - 11, 1);
    const out: string[] = [];
    for (const cursor = start; toKey(cursor) <= today; cursor.setDate(cursor.getDate() + 1)) out.push(toKey(cursor));
    return out;
  }, [range, today]);

  const series = dailySeries(moduleId, entries, days, settings);

  const bars = useMemo<Bar[]>(() => {
    if (range !== "year") {
      return series.points.map((p) => ({
        key: p.key,
        label: formatDayMonth(p.key),
        value: p.value,
        isToday: p.key === today,
      }));
    }
    // Month buckets, each averaging the days that were actually filled in.
    const buckets = new Map<string, number[]>();
    for (const p of series.points) {
      const bucket = p.key.slice(0, 7);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      if (p.value !== null) buckets.get(bucket)!.push(p.value);
    }
    return [...buckets.entries()].map(([bucket, values]) => ({
      key: bucket,
      label: formatMonth(`${bucket}-01`),
      value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      isToday: bucket === today.slice(0, 7),
    }));
  }, [range, series.points, today]);

  const rangeLabel = range === "week" ? "cette semaine" : range === "month" ? formatMonth(today) : "12 derniers mois";

  return (
    <main className="main">
      <header className="screen-head">
        <div>
          <div className="eyebrow" style={{ color: mod.color }}>
            module · {settings.modules[mod.id].page}
          </div>
          <h1 className="screen-title" style={{ marginTop: 9 }}>
            {mod.name}
          </h1>
          <div className="hand" style={{ marginTop: 6 }}>
            {rangeLabel}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="segmented">
            {(["week", "month", "year"] as Range[]).map((r) => (
              <button key={r} type="button" className={range === r ? "active" : ""} onClick={() => setRange(r)}>
                {r === "week" ? "Semaine" : r === "month" ? "Mois" : "Année"}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Retour
          </button>
        </div>
      </header>

      <hr className="rule" />

      {moduleId === "sleep" ? (
        <SleepDetail days={days} bars={bars} />
      ) : (
        <GenericDetail moduleId={moduleId} days={days} bars={bars} scale={series.scale} />
      )}
    </main>
  );
}

/* ---------- the chart, shared by both detail flavours ---------- */

interface ChartProps {
  bars: Bar[];
  ceiling: number;
  colour: string;
  goalRatio?: number;
  format: (value: number) => string;
}

function Chart({ bars, ceiling, colour, goalRatio, format }: ChartProps) {
  return (
    <>
      <div className="chart">
        {goalRatio !== undefined && <div className="chart-goal" style={{ bottom: `${goalRatio * 100}%` }} />}
        <div className="chart-bars">
          {bars.map((b) => {
            const pct = b.value === null ? 2 : Math.max(2, Math.min(100, (b.value / ceiling) * 100));
            return (
              <div
                key={b.key}
                className={`chart-bar${b.value === null ? " empty" : ""}`}
                style={{
                  height: `${pct}%`,
                  background: b.value === null ? undefined : b.isToday ? colour : "#ddd5c4",
                }}
                title={b.value === null ? `${b.label} — non renseigné` : `${b.label} — ${format(b.value)}`}
              />
            );
          })}
        </div>
      </div>
      <div className="chart-axis">
        <span>{bars[0]?.label}</span>
        <span>{bars[bars.length - 1]?.label}</span>
      </div>
    </>
  );
}

/* ---------- sleep: the month view from design 3b ---------- */

function SleepDetail({ days, bars }: { days: string[]; bars: Bar[] }) {
  const { entries, settings } = useJournal();
  const goal = settings.sleepGoal;
  const stats = sleepStats(entries, days, goal);
  const overlap = shortNightPainOverlap(entries, days);

  // A fixed 10h ceiling keeps the objective line in a stable place as data changes.
  const ceiling = 600;
  const recent = [...days].reverse().filter((k) => sleepMinutes(entries[k]) !== null).slice(0, 4);

  return (
    <>
      <div className="stat-grid">
        <Stat label="Moyenne" value={stats.averageMinutes === null ? "—" : formatDuration(stats.averageMinutes)} />
        <Stat label={`Nuits ≥ ${formatDuration(goal * 60)}`} value={String(stats.longNights)} suffix={` / ${stats.nights}`} />
        <Stat label="Coucher médian" value={stats.medianBedMinutes === null ? "—" : formatClock(stats.medianBedMinutes)} />
        <Stat
          label="Qualité"
          value={stats.averageQuality === null ? "—" : stats.averageQuality.toFixed(1).replace(".", ",")}
          suffix={stats.averageQuality === null ? undefined : " / 5"}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">
            Heures par nuit · {formatDayMonth(days[0])} → {formatDayMonth(days[days.length - 1])}
          </span>
          <span className="hand-sm" style={{ color: "var(--rose)" }}>
            — objectif {formatDuration(goal * 60)}
          </span>
        </div>
        <Chart
          bars={bars}
          ceiling={ceiling}
          colour="var(--indigo)"
          goalRatio={(goal * 60) / ceiling}
          format={(v) => formatDuration(Math.round(v))}
        />
      </div>

      <div className="detail-cols">
        <div className="panel" style={{ flex: 1, minWidth: 320, marginTop: 0 }}>
          <div className="panel-title" style={{ marginBottom: 12 }}>
            Dernières nuits
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>Date</span>
              <span>Coucher → réveil</span>
              <span>Durée</span>
              <span>Qualité</span>
              <span>Note</span>
            </div>
            {recent.length === 0 && (
              <div className="table-row">
                <span className="muted">Pas encore de nuit enregistrée sur cette période.</span>
              </div>
            )}
            {recent.map((key) => {
              const s = entries[key]!.sleep!;
              const minutes = sleepMinutes(entries[key])!;
              const q = s.quality ?? null;
              const qColour = q === null ? "var(--muted)" : q >= 4 ? "var(--sage)" : q === 3 ? "var(--ochre)" : "var(--rose)";
              return (
                <div className="table-row" key={key}>
                  <span>{formatDayMonth(key)}</span>
                  <span className="muted">
                    {s.bed.replace(":", "h")} → {s.wake.replace(":", "h")}
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatDuration(minutes)}</span>
                  <span style={{ color: qColour }}>{q === null ? "—" : `${q} / 5`}</span>
                  <span className="muted">{s.note || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="side-panel">
          <div className="panel-title" style={{ color: "var(--indigo)", marginBottom: 10 }}>
            Croisements
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "#5c574c" }}>
            {overlap
              ? `Les nuits sous 6h coïncident avec une douleur à 6/10 ou plus dans ${overlap.withPain} cas sur ${overlap.short}.`
              : "Pas encore assez de nuits courtes sur cette période pour croiser avec la douleur."}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- every other tracker, on the same shell ---------- */

function GenericDetail({
  moduleId,
  days,
  bars,
  scale,
}: {
  moduleId: ModuleId;
  days: string[];
  bars: Bar[];
  scale: number;
}) {
  const { entries, settings } = useJournal();
  const mod = moduleDef(moduleId);
  const values = bars.filter((b) => b.value !== null).map((b) => b.value!);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const round = (n: number) => n.toFixed(1).replace(".", ",").replace(",0", "");

  return (
    <>
      <div className="stat-grid">
        <Stat label="Jours renseignés" value={String(values.length)} suffix={` / ${days.length}`} color={mod.color} />
        <Stat
          label="Moyenne"
          value={average === null ? "—" : round(average)}
          suffix={average === null ? undefined : ` / ${scale}`}
          color={mod.color}
        />
        <Stat label="Maximum" value={values.length ? round(Math.max(...values)) : "—"} color={mod.color} />
        <Stat label="Aujourd'hui" value={summaryValue(moduleId, entries[todayKey()], settings)} color={mod.color} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">
            {mod.name} · {formatDayMonth(days[0])} → {formatDayMonth(days[days.length - 1])}
          </span>
          <span className="hand-sm">échelle 0 → {scale}</span>
        </div>
        <Chart bars={bars} ceiling={scale} colour={mod.color} format={round} />
      </div>
    </>
  );
}

function Stat({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color?: string }) {
  return (
    <div className="stat" style={color ? { borderLeftColor: color } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
    </div>
  );
}
