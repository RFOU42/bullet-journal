import { useJournal } from "../state/JournalContext";
import { TrackerEditor } from "./TrackerEditor";
import { AddInput, newId } from "./AddInput";
import { todayKey } from "../lib/dates";
import type { ModuleDef } from "../lib/types";

interface Props {
  mod: ModuleDef;
  dayKey: string;
  onOpenDetail?: () => void;
}

/**
 * A module as it appears on one of the journal's pages: the title in the
 * module's accent, then whatever that module is filled in with — trackers get
 * the direct-entry controls, collections get their own small editors.
 */
export function ModuleCard({ mod, dayKey, onOpenDetail }: Props) {
  const { entries } = useJournal();

  return (
    <div className="card" style={{ borderLeftColor: mod.color }}>
      <div className="card-title" style={{ color: mod.color, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>{mod.name}</span>
        {onOpenDetail && (
          <button type="button" className="btn-link" style={{ fontSize: 11.5 }} onClick={onOpenDetail}>
            détail
          </button>
        )}
      </div>
      {mod.kind === "tracker" ? (
        <TrackerEditor id={mod.id} dayKey={dayKey} entry={entries[dayKey]} color={mod.color} />
      ) : (
        <CollectionBody mod={mod} dayKey={dayKey} />
      )}
    </div>
  );
}

function CollectionBody({ mod, dayKey }: { mod: ModuleDef; dayKey: string }) {
  const { collections, setCollections, entries, updateEntry } = useJournal();

  switch (mod.id) {
    case "notes":
      return (
        <textarea
          className="textarea-note"
          placeholder="brain dump du jour…"
          value={entries[dayKey]?.notes ?? ""}
          onChange={(e) => updateEntry(dayKey, { notes: e.target.value })}
        />
      );

    case "goals":
      return (
        <div>
          {collections.goals.map((g) => (
            <div key={g.id} style={{ padding: "7px 0" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 13.5 }}>
                <span className="item-label">{g.label}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {g.current} / {g.target}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Avancer ${g.label}`}
                  onClick={() =>
                    setCollections({
                      goals: collections.goals.map((x) =>
                        x.id === g.id ? { ...x, current: Math.min(x.target, x.current + 1) } : x,
                      ),
                    })
                  }
                >
                  +
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Supprimer ${g.label}`}
                  onClick={() => setCollections({ goals: collections.goals.filter((x) => x.id !== g.id) })}
                >
                  ✕
                </button>
              </div>
              <div className="meter" style={{ marginTop: 6 }}>
                <div
                  className="meter-fill"
                  style={{ width: `${Math.round((g.current / Math.max(1, g.target)) * 100)}%`, background: mod.color }}
                />
              </div>
            </div>
          ))}
          <AddInput
            placeholder="un objectif — « Lire 12 livres »"
            onAdd={(label) => {
              // A trailing number reads as the target: "Lire 12 livres" → 12.
              const target = Number(/(\d+)/.exec(label)?.[1] ?? 1);
              setCollections({ goals: [...collections.goals, { id: newId(), label, target, current: 0 }] });
            }}
          />
        </div>
      );

    case "shopping":
      return (
        <div>
          {collections.shopping.map((it) => (
            <div className="item-row" key={it.id}>
              <button
                type="button"
                className={`check-row${it.done ? "" : " off"}`}
                onClick={() =>
                  setCollections({
                    shopping: collections.shopping.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)),
                  })
                }
              >
                <span className={`checkbox${it.done ? " on" : ""}`} style={it.done ? { background: mod.color } : undefined}>
                  {it.done ? "✓" : ""}
                </span>
                <span className={`item-label${it.done ? " done" : ""}`}>{it.label}</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Supprimer ${it.label}`}
                onClick={() => setCollections({ shopping: collections.shopping.filter((x) => x.id !== it.id) })}
              >
                ✕
              </button>
            </div>
          ))}
          <AddInput
            placeholder="à emporter, à acheter…"
            onAdd={(label) =>
              setCollections({ shopping: [...collections.shopping, { id: newId(), label, done: false }] })
            }
          />
        </div>
      );

    case "books":
      return (
        <div>
          {collections.books.map((b) => (
            <div className="item-row" key={b.id}>
              <button
                type="button"
                className={`check-row${b.done ? "" : " off"}`}
                onClick={() =>
                  setCollections({ books: collections.books.map((x) => (x.id === b.id ? { ...x, done: !x.done } : x)) })
                }
              >
                <span className={`checkbox${b.done ? " on" : ""}`} style={b.done ? { background: mod.color } : undefined}>
                  {b.done ? "✓" : ""}
                </span>
                <span className={`item-label${b.done ? " done" : ""}`}>
                  {b.title}
                  {b.author && <span className="muted"> — {b.author}</span>}
                </span>
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Supprimer ${b.title}`}
                onClick={() => setCollections({ books: collections.books.filter((x) => x.id !== b.id) })}
              >
                ✕
              </button>
            </div>
          ))}
          <AddInput
            placeholder="titre, auteur"
            onAdd={(value) => {
              const [title, author = ""] = value.split(",").map((s) => s.trim());
              setCollections({ books: [...collections.books, { id: newId(), title, author, done: false }] });
            }}
          />
        </div>
      );

    case "quotes":
      return (
        <div>
          {collections.quotes.map((q) => (
            <div key={q.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--rule)" }}>
              <div style={{ font: "500 17px/1.4 var(--hand)", color: "#5c574c" }}>« {q.text} »</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  {q.source}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Supprimer la citation"
                  onClick={() => setCollections({ quotes: collections.quotes.filter((x) => x.id !== q.id) })}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <AddInput
            placeholder="une citation, sa source"
            onAdd={(value) => {
              const [text, source = ""] = value.split(",").map((s) => s.trim());
              setCollections({ quotes: [...collections.quotes, { id: newId(), text, source }] });
            }}
          />
        </div>
      );

    case "budget": {
      const spent = collections.expenses.reduce((sum, e) => sum + e.amount, 0);
      const pct = Math.min(100, Math.round((spent / Math.max(1, collections.budgetTarget)) * 100));
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
            <span>Dépenses</span>
            <span>
              {spent.toFixed(2)} € / {collections.budgetTarget} €
            </span>
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${pct}%`, background: mod.color }} />
          </div>
          <div style={{ marginTop: 10 }}>
            {collections.expenses.slice(-4).map((e) => (
              <div className="item-row" key={e.id}>
                <span className="item-label">
                  {e.label}
                  <span className="muted"> · {e.category}</span>
                </span>
                <span>{e.amount.toFixed(2)} €</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Supprimer ${e.label}`}
                  onClick={() => setCollections({ expenses: collections.expenses.filter((x) => x.id !== e.id) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <AddInput
            placeholder="dépense, catégorie, montant"
            onAdd={(value) => {
              const [label, category = "Divers", amount = "0"] = value.split(",").map((s) => s.trim());
              const parsed = Number(amount.replace(",", "."));
              if (!Number.isFinite(parsed)) return;
              setCollections({
                expenses: [
                  ...collections.expenses,
                  { id: newId(), label, category, amount: parsed, date: todayKey() },
                ],
              });
            }}
          />
        </div>
      );
    }

    default:
      return null;
  }
}
