import type { SyncStatus } from "../state/JournalContext";

const LABEL: Record<SyncStatus, string> = {
  loading: "chargement…",
  saving: "enregistrement…",
  saved: "tout est enregistré en direct",
  error: "échec de la sauvegarde — nouvelle tentative au prochain changement",
};

/** The small reassurance text at the foot of the fil — now a real network write, not a local one. */
export function SyncStatusLabel({ status }: { status: SyncStatus }) {
  return <span style={status === "error" ? { color: "var(--rose)" } : undefined}>{LABEL[status]}</span>;
}
