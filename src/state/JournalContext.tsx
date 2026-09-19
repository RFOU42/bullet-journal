import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MODULES, TODAY_PAGE } from "../lib/modules";
import { emptyData, loadJournal, saveJournal } from "../lib/storage";
import type { Collections, DayEntry, JournalData, ModuleDef, ModuleId, Settings } from "../lib/types";

export type SyncStatus = "loading" | "saved" | "saving" | "error";

interface JournalApi {
  data: JournalData;
  settings: Settings;
  entries: Record<string, DayEntry>;
  collections: Collections;
  syncStatus: SyncStatus;
  /** Enabled modules, catalogue order. */
  activeModules: ModuleDef[];
  /** Enabled trackers assigned to "Aujourd'hui" — the fil du jour. */
  filModules: ModuleDef[];
  modulesOnPage: (page: string) => ModuleDef[];
  updateEntry: (key: string, patch: Partial<DayEntry>) => void;
  setSettings: (patch: Partial<Settings>) => void;
  toggleModule: (id: ModuleId) => void;
  setModulePage: (id: ModuleId, page: string) => void;
  setCollections: (patch: Partial<Collections>) => void;
  replaceAll: (next: JournalData) => void;
  /** Cancels any pending debounced write and saves right now — call before signing out. */
  flush: () => Promise<void>;
}

const Ctx = createContext<JournalApi | null>(null);

/** How long to wait after the last edit before writing to Supabase — keystrokes coalesce into one upsert. */
const SAVE_DEBOUNCE_MS = 700;

export function JournalProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [data, setData] = useState<JournalData>(emptyData);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  // Set right before every setData(...) that *loads* data (mount, or the
  // fetch resolving) so the save effect that follows can tell "this change
  // is a load echoing back" from "this change is a real edit" — loading is
  // async now, so the old synchronous-init "skip the very first effect run"
  // trick no longer lines up with when the loaded data actually arrives.
  const suppressNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The freshest data + save call, so `flush()` can fire it immediately
  // instead of waiting out the debounce — otherwise an edit made just before
  // "Se déconnecter" would be cancelled by the unmount, never written.
  const pendingSave = useRef<(() => Promise<void>) | null>(null);

  // Load this user's journal on sign-in (userId changing means a different
  // account — e.g. sign out, then sign back in as someone else).
  useEffect(() => {
    let cancelled = false;
    setSyncStatus("loading");
    loadJournal(userId).then((loaded) => {
      if (cancelled) return;
      suppressNextSave.current = true;
      setData(loaded);
      setSyncStatus("saved");
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (suppressNextSave.current) {
      suppressNextSave.current = false;
      return;
    }
    setSyncStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () => {
      saveTimer.current = null;
      return saveJournal(userId, data).then(({ ok }) => {
        pendingSave.current = null;
        setSyncStatus(ok ? "saved" : "error");
      });
    };
    pendingSave.current = run;
    saveTimer.current = setTimeout(run, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // Deliberately `[data]` only, not `[data, userId]`: this must fire on a
    // real edit and nothing else. userId changing alone (the load effect
    // above hasn't resolved yet) would otherwise re-run this effect with the
    // *previous* user's still-current `data` and save it under the *new*
    // user's id — `userId` is still read fresh from the closure below, it
    // just shouldn't be a trigger on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const api = useMemo<JournalApi>(() => {
    const { settings } = data;
    const activeModules = MODULES.filter((m) => settings.modules[m.id].on);

    return {
      data,
      settings,
      entries: data.entries,
      collections: data.collections,
      syncStatus,
      activeModules,
      filModules: activeModules.filter((m) => m.moment && settings.modules[m.id].page === TODAY_PAGE),
      modulesOnPage: (page) => activeModules.filter((m) => settings.modules[m.id].page === page),

      updateEntry: (key, patch) =>
        setData((d) => ({ ...d, entries: { ...d.entries, [key]: { ...d.entries[key], ...patch } } })),

      setSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      toggleModule: (id) =>
        setData((d) => ({
          ...d,
          settings: {
            ...d.settings,
            modules: { ...d.settings.modules, [id]: { ...d.settings.modules[id], on: !d.settings.modules[id].on } },
          },
        })),

      setModulePage: (id, page) =>
        setData((d) => ({
          ...d,
          settings: {
            ...d.settings,
            modules: { ...d.settings.modules, [id]: { ...d.settings.modules[id], page } },
          },
        })),

      setCollections: (patch) => setData((d) => ({ ...d, collections: { ...d.collections, ...patch } })),

      replaceAll: (next) => setData(next),

      flush: async () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        if (pendingSave.current) await pendingSave.current();
      },
    };
  }, [data, syncStatus]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useJournal(): JournalApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useJournal doit être utilisé dans un JournalProvider");
  return ctx;
}
