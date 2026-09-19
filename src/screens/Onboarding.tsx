import { useState } from "react";
import { DOMAINS, MODULES } from "../lib/modules";
import { emptyData, sampleData } from "../lib/storage";
import { useAuth } from "../state/AuthContext";
import { useJournal } from "../state/JournalContext";
import type { DomainId } from "../lib/types";

const STEPS = ["Ton compte", "Choisir tes modules", "Composer tes pages"];

/** Design 3d — the three-step first launch. */
export function Onboarding() {
  const { settings, toggleModule, setModulePage, setSettings, replaceAll, activeModules } = useJournal();
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [withSample, setWithSample] = useState(false);

  const finish = () => setSettings({ onboarded: true });

  return (
    <div className="onboarding">
      <aside className="onboarding-rail">
        <div>
          <div className="brand">bullet.</div>
          <div className="brand-sub">on installe ton carnet</div>
          <div className="step-list">
            {STEPS.map((label, i) => (
              <div key={label} className={`step${i === step ? " current" : i < step ? " done" : ""}`}>
                <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="onboarding-foot">
          Ton carnet est privé — personne d'autre que toi ne peut le lire. Tout est modifiable plus tard.
        </div>
      </aside>

      <main className="main dotted" style={{ padding: "28px 30px" }}>
        <div className="eyebrow">étape {String(step + 1).padStart(2, "0")} / 03</div>

        {step === 0 && (
          <>
            <h1 className="screen-title" style={{ marginTop: 10, fontSize: 34 }}>
              Ton compte est prêt
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 13.5, color: "var(--ink-soft)", maxWidth: 480 }}>
              Ton carnet est sauvegardé automatiquement sur <strong>{session?.user.email}</strong>, accessible depuis
              n'importe quel appareil où tu te connectes.
            </p>
            <hr className="rule" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
              <button
                type="button"
                className={`choice-card${withSample ? " selected" : ""}`}
                aria-pressed={withSample}
                onClick={() => {
                  // Toggling either seeds the five sample days or clears them again.
                  replaceAll(withSample ? emptyData() : sampleData());
                  setWithSample(!withSample);
                }}
              >
                <span
                  className={`checkbox${withSample ? " on" : ""}`}
                  style={{ marginTop: 2, background: withSample ? "var(--indigo)" : undefined }}
                >
                  {withSample ? "✓" : ""}
                </span>
                <span>
                  <strong style={{ fontSize: 14 }}>Commencer avec des données d'exemple</strong>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
                    Cinq jours déjà remplis, pour voir la vue hebdo et les détails tout de suite. Tout est effaçable.
                  </div>
                </span>
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="screen-title" style={{ marginTop: 10, fontSize: 34 }}>
              Choisis tes modules
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 13.5, color: "var(--ink-soft)", maxWidth: 460 }}>
              Prends seulement ce que tu tiendras vraiment. Tu pourras en ajouter à tout moment.
            </p>
            <hr className="rule" />
            <div className="pick-grid">
              <DomainCard domain="bienetre" />
              <div className="pick-col">
                <DomainCard domain="organisation" />
                <DomainCard domain="esprit" />
                <DomainCard domain="finances" />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="screen-title" style={{ marginTop: 10, fontSize: 34 }}>
              Compose tes pages
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 13.5, color: "var(--ink-soft)", maxWidth: 480 }}>
              Range chaque module sur une page. Ceux que tu mets sur « Aujourd'hui » deviennent ton fil du jour, à
              remplir dans l'ordre que tu veux.
            </p>
            <hr className="rule" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
              {activeModules.map((mod) => (
                <div key={mod.id} className="mod-row" style={{ borderLeftColor: DOMAINS[mod.domain].color }}>
                  <span className="mod-domain">{DOMAINS[mod.domain].short}</span>
                  <span className="mod-name">{mod.name}</span>
                  <select
                    className="select-pill"
                    value={settings.modules[mod.id].page}
                    aria-label={`Page de ${mod.name}`}
                    onChange={(e) => setModulePage(mod.id, e.target.value)}
                  >
                    {settings.pages.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        <hr className="rule" style={{ margin: "20px 0 14px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span className="hand">
            {step === 1
              ? `${activeModules.length} modules — c'est déjà bien`
              : step === 2
                ? "tu pourras tout réorganiser plus tard"
                : "on commence simplement"}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                Retour
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (step === STEPS.length - 1 ? finish() : setStep(step + 1))}
            >
              {step === 0 ? "Choisir mes modules" : step === 1 ? "Composer mes pages" : "Ouvrir mon carnet"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  function DomainCard({ domain }: { domain: DomainId }) {
    const meta = DOMAINS[domain];
    return (
      <div className="pick-card" style={{ borderLeftColor: meta.color }}>
        <div className="pick-card-title" style={{ color: meta.color }}>
          {meta.label}
        </div>
        <div className="pick-list">
          {MODULES.filter((m) => m.domain === domain).map((mod) => {
            const on = settings.modules[mod.id].on;
            return (
              <button
                key={mod.id}
                type="button"
                className={`check-row${on ? "" : " off"}`}
                aria-pressed={on}
                onClick={() => toggleModule(mod.id)}
              >
                <span className={`checkbox${on ? " on" : ""}`} style={on ? { background: meta.color } : undefined}>
                  {on ? "✓" : ""}
                </span>
                {mod.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
}
