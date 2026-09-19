import { useRef, useState } from "react";
import { DOMAINS, MODULES } from "../lib/modules";
import { exportToFile, parseImported } from "../lib/storage";
import { useJournal } from "../state/JournalContext";
import { useAuth } from "../state/AuthContext";
import { SyncStatusLabel } from "../components/SyncStatusLabel";

/** Design 3a: one row per module — on/off, and which page it belongs to. */
export function CustomizeScreen() {
  const { data, settings, toggleModule, setModulePage, setSettings, replaceAll, activeModules, syncStatus, flush } = useJournal();
  const { session, signOut } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onImport = async (file: File) => {
    try {
      replaceAll(parseImported(await file.text()));
      setNotice("Carnet importé.");
    } catch {
      setNotice("Ce fichier n'est pas un carnet exportable.");
    }
  };

  return (
    <main className="main" style={{ maxWidth: 900 }}>
      <h1 className="screen-title">Personnaliser</h1>
      <div className="hand" style={{ marginTop: 7 }}>
        ce que je veux vraiment tenir
      </div>
      <p style={{ margin: "16px 0 0", fontSize: 13.5, color: "var(--ink-soft)", maxWidth: 520 }}>
        Active un module pour le faire apparaître, et choisis sa page. Ce qui est éteint disparaît complètement de
        l'interface.
      </p>

      <hr className="rule" />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MODULES.map((mod) => {
          const state = settings.modules[mod.id];
          const domain = DOMAINS[mod.domain];
          return (
            <div
              key={mod.id}
              className={`mod-row${state.on ? "" : " off"}`}
              style={{ borderLeftColor: state.on ? domain.color : "var(--dot)" }}
            >
              <span className="mod-domain">{domain.short}</span>
              <span className="mod-name">{mod.name}</span>
              <select
                className="select-pill"
                value={state.page}
                disabled={!state.on}
                aria-label={`Page de ${mod.name}`}
                onChange={(e) => setModulePage(mod.id, e.target.value)}
              >
                {settings.pages.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`toggle${state.on ? " on" : ""}`}
                role="switch"
                aria-checked={state.on}
                aria-label={`Activer ${mod.name}`}
                style={state.on ? { background: domain.color } : undefined}
                onClick={() => toggleModule(mod.id)}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          );
        })}
      </div>

      <hr className="rule" />

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <label style={{ fontSize: 13 }}>
          <div className="field-label">Objectif de sommeil (heures)</div>
          <input
            className="input"
            type="number"
            min={4}
            max={12}
            step={0.5}
            style={{ width: 84 }}
            value={settings.sleepGoal}
            onChange={(e) => setSettings({ sleepGoal: Number(e.target.value) })}
          />
        </label>
        <div style={{ fontSize: 13 }}>
          <div className="field-label">Habitudes suivies</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", maxWidth: 420 }}>
            {settings.habits.map((h) => (
              <span className="tag" key={h} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                {h}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Retirer ${h}`}
                  onClick={() => setSettings({ habits: settings.habits.filter((x) => x !== h) })}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <hr className="rule" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="field-label" style={{ marginBottom: 4 }}>Compte</div>
          <div style={{ fontSize: 13.5 }}>{session?.user.email}</div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void flush().then(signOut)}>
          Se déconnecter
        </button>
      </div>

      <hr className="rule" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {activeModules.length} modules actifs · {settings.pages.length} pages ·{" "}
          <SyncStatusLabel status={syncStatus} />
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => setNotice((await exportToFile(data)).message)}
          >
            Exporter
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            Importer
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImport(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {notice && (
        <div className="hand" style={{ marginTop: 12 }}>
          {notice}
        </div>
      )}
    </main>
  );
}
