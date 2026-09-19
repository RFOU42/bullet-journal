import { useState } from "react";
import { DayFil } from "../components/DayFil";
import { ModuleCard } from "../components/ModuleCard";
import { isFilled, summaryValue } from "../lib/compute";
import { addDays, capitalise, formatLong, todayKey } from "../lib/dates";
import { TODAY_PAGE } from "../lib/modules";
import { useDayReminder } from "../lib/useDayReminder";
import { useJournal } from "../state/JournalContext";
import type { Route } from "../lib/routes";
import type { ModuleId } from "../lib/types";

interface Props {
  page: string;
  onNavigate: (route: Route) => void;
}

export function PageScreen({ page, onNavigate }: Props) {
  return page === TODAY_PAGE ? <TodayPage onNavigate={onNavigate} /> : <ModulePage page={page} onNavigate={onNavigate} />;
}

/* ---------- "Aujourd'hui" — the fil du jour (design 6a) ---------- */

function TodayPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { filModules, modulesOnPage, entries, settings } = useJournal();
  const today = todayKey();
  const [dayKey, setDayKey] = useState(today);
  const [openTracker, setOpenTracker] = useState<ModuleId | null>(null);

  const entry = entries[dayKey];
  const missing = filModules.filter((m) => !isFilled(m.id, entry, settings));
  const nonTrackers = modulesOnPage(TODAY_PAGE).filter((m) => m.kind !== "tracker");

  const reminder = useDayReminder(today);

  const goToGap = () => {
    if (!reminder) return;
    setDayKey(reminder.key);
    setOpenTracker(reminder.gaps[0].id);
  };

  return (
    <>
      <main className="main dotted">
        <h1 className="screen-title" style={{ fontSize: 32 }}>
          {capitalise(formatLong(dayKey))}
        </h1>
        <div className="hand" style={{ marginTop: 6 }}>
          {missing.length ? `${missing.map((m) => m.name).join(" · ")} — à remplir` : "journée complète"}
        </div>

        {reminder && reminder.key !== dayKey && (
          <div className="banner">
            <span className="banner-dot" />
            <span className="banner-text">
              {capitalise(formatLong(reminder.key))} : {reminder.gaps.map((g) => g.name.toLowerCase()).join(", ")} —
              non renseigné{reminder.gaps.length > 1 ? "s" : ""}
            </span>
            <button type="button" className="btn-link" onClick={goToGap}>
              Compléter
            </button>
          </div>
        )}

        <div className="card-grid">
          {filModules.map((m) => (
            <button
              key={m.id}
              type="button"
              className="card card-clickable"
              style={{ borderLeftColor: m.color }}
              onClick={() => onNavigate({ name: "detail", module: m.id })}
            >
              <div className="card-title" style={{ color: m.color, marginBottom: 0 }}>
                {m.name}
              </div>
              <div className="card-value" style={{ fontSize: m.id === "mood" ? 24 : undefined }}>
                {summaryValue(m.id, entry, settings)}
              </div>
            </button>
          ))}
        </div>

        {nonTrackers.length > 0 && (
          <div className="card-grid-3">
            {nonTrackers.map((m) => (
              <ModuleCard key={m.id} mod={m} dayKey={dayKey} />
            ))}
          </div>
        )}

        <div className="hand-sm" style={{ marginTop: 20 }}>
          ← ‹ et › en haut du volet pour changer de jour
        </div>
      </main>

      <DayFil
        dayKey={dayKey}
        openTracker={openTracker}
        onOpenTracker={setOpenTracker}
        onChangeDay={setDayKey}
        onStepDay={(delta) => {
          const next = addDays(dayKey, delta);
          if (next > today) return;
          setDayKey(next);
        }}
        canGoForward={dayKey < today}
        onCloseDay={() => {
          setOpenTracker(null);
          onNavigate({ name: "week" });
        }}
      />
    </>
  );
}

/* ---------- any other page — a grid of its modules (design 2a) ---------- */

function ModulePage({ page, onNavigate }: { page: string; onNavigate: (route: Route) => void }) {
  const { modulesOnPage } = useJournal();
  const mods = modulesOnPage(page);
  const today = todayKey();

  return (
    <main className="main dotted">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">{page}</h1>
          <div className="hand" style={{ marginTop: 6 }}>
            {capitalise(formatLong(today))}
          </div>
        </div>
        <div className="legend-pill">
          <span>• tâche</span>
          <span>○ événement</span>
          <span>— note</span>
        </div>
      </header>

      {mods.length === 0 ? (
        <div className="empty-note" style={{ marginTop: 24 }}>
          Aucun module actif sur cette page. Ajoute-en depuis{" "}
          <button type="button" className="btn-link" onClick={() => onNavigate({ name: "customize" })}>
            Personnaliser
          </button>
          .
        </div>
      ) : (
        <div className="card-grid-3">
          {mods.map((m) => (
            <ModuleCard
              key={m.id}
              mod={m}
              dayKey={today}
              onOpenDetail={m.kind === "tracker" ? () => onNavigate({ name: "detail", module: m.id }) : undefined}
            />
          ))}
        </div>
      )}
    </main>
  );
}
