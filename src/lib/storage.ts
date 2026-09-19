import { addDays, todayKey } from "./dates";
import { DEFAULT_HABITS, DEFAULT_PAGES, MODULES } from "./modules";
import { supabase } from "./supabaseClient";
import type { Collections, JournalData, ModuleId, ModuleSettings, Settings } from "./types";

export function defaultSettings(): Settings {
  const modules = {} as Record<ModuleId, ModuleSettings>;
  for (const m of MODULES) modules[m.id] = { on: m.defaultOn, page: m.defaultPage };
  return {
    onboarded: false,
    pages: [...DEFAULT_PAGES],
    modules,
    habits: [...DEFAULT_HABITS],
    sleepGoal: 7.5,
  };
}

export function defaultCollections(): Collections {
  return { goals: [], shopping: [], books: [], quotes: [], expenses: [], budgetTarget: 900 };
}

export function emptyData(): JournalData {
  return { version: 1, settings: defaultSettings(), entries: {}, collections: defaultCollections() };
}

/**
 * Merge stored data onto the current defaults, so a journal written before a
 * module existed keeps working instead of crashing on a missing key.
 */
function reconcile(raw: unknown): JournalData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<JournalData>;
  const stored = data.settings;

  const modules = { ...base.settings.modules };
  if (stored?.modules) {
    for (const m of MODULES) {
      const s = stored.modules[m.id];
      if (s && typeof s.on === "boolean" && typeof s.page === "string") modules[m.id] = s;
    }
  }

  return {
    version: 1,
    settings: {
      onboarded: stored?.onboarded ?? false,
      pages: stored?.pages?.length ? stored.pages : base.settings.pages,
      modules,
      habits: stored?.habits?.length ? stored.habits : base.settings.habits,
      sleepGoal: typeof stored?.sleepGoal === "number" ? stored.sleepGoal : base.settings.sleepGoal,
    },
    entries: data.entries && typeof data.entries === "object" ? data.entries : {},
    collections: { ...base.collections, ...(data.collections ?? {}) },
  };
}

/**
 * The journal lives in one row per user in `public.journals` (RLS-scoped to
 * `auth.uid()`), as a single JSONB document — the cloud counterpart of the
 * localStorage blob this app used before accounts existed.
 */
export async function loadJournal(userId: string): Promise<JournalData> {
  const { data, error } = await supabase.from("journals").select("data").eq("user_id", userId).maybeSingle();
  if (error || !data) return emptyData();
  return reconcile(data.data);
}

export async function saveJournal(userId: string, data: JournalData): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("journals").upsert({ user_id: userId, data });
  return { ok: !error };
}

/**
 * Hand the journal to the reader as a JSON file.
 *
 * Served as a published Artifact the page cannot start its own download, so it
 * asks the viewer through the `downloads` capability; running locally there is
 * no such host and an ordinary anchor does the job.
 */
export async function exportToFile(data: JournalData): Promise<{ ok: boolean; message: string }> {
  const json = JSON.stringify(data, null, 2);
  const filename = `bullet-journal-${todayKey()}.json`;

  let downloads: { save(r: { filename: string; data: string }): Promise<unknown> } | null = null;
  try {
    downloads = (await window.claude?.use?.("downloads")) ?? null;
  } catch {
    downloads = null;
  }

  if (downloads) {
    try {
      await downloads.save({ filename, data: json });
      return { ok: true, message: "Carnet exporté." };
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "declined") return { ok: false, message: "Export annulé." };
      if (code === "rate_limited") return { ok: false, message: "Un export est déjà en cours." };
      return { ok: false, message: "L'export n'a pas pu aboutir." };
    }
  }

  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true, message: "Carnet exporté." };
}

export function parseImported(text: string): JournalData {
  return reconcile(JSON.parse(text));
}

/**
 * Five days of plausible history, offered at first launch so the weekly and
 * detail screens have something to show before the journal has been lived in.
 */
export function sampleData(): JournalData {
  // Left un-onboarded on purpose: loading the sample is a choice made *inside*
  // the first-launch flow, which still has to finish.
  const data = emptyData();
  const t = todayKey();
  const days: [string, JournalData["entries"][string]][] = [
    [addDays(t, -4), { sleep: { bed: "23:10", wake: "06:55", quality: 4 }, mood: 2, habits: { "Boire de l'eau": true, "Méditer": true, "Étirements": true }, pain: { value: 4, note: "nuque" }, gratitude: ["Marché du matin", "Appel de maman", "Pluie tiède"], activity: { minutes: 30, kind: "Marche" } }],
    [addDays(t, -3), { sleep: { bed: "01:05", wake: "06:50", quality: 2 }, mood: 1, habits: { "Boire de l'eau": true }, pain: { value: 6, note: "soirée tardive" }, gratitude: ["Terrasse", "", ""] }],
    [addDays(t, -2), { sleep: { bed: "23:20", wake: "08:00", quality: 5 }, mood: 3, habits: { "Boire de l'eau": true, "Méditer": true }, pain: { value: 2 }, gratitude: ["Sieste", "Livre fini", ""], activity: { minutes: 45, kind: "Vélo" } }],
    [addDays(t, -1), { sleep: { bed: "00:15", wake: "07:10", quality: 3 }, mood: 1, habits: { "Boire de l'eau": true, "Méditer": true }, gratitude: ["Réunion annulée", "Pain frais", ""] }],
    [t, { sleep: { bed: "23:40", wake: "07:00", quality: 4 }, mood: 2, habits: { "Boire de l'eau": true, "Étirements": true }, gratitude: ["Le café du matin", "Un message d'un vieil ami", ""], notes: "Idée cadeau pour Léa… réserver le restaurant jeudi" }],
  ];
  for (const [key, entry] of days) data.entries[key] = entry;

  data.collections = {
    goals: [{ id: "g1", label: "Lire 12 livres cette année", target: 12, current: 4 }],
    shopping: [],
    books: [
      { id: "b1", title: "Les Argonautes", author: "M. Nelson", done: false },
      { id: "b2", title: "Circé", author: "M. Miller", done: false },
      { id: "b3", title: "Klara et le Soleil", author: "K. Ishiguro", done: true },
    ],
    quotes: [],
    expenses: [
      { id: "e1", label: "Courses", category: "Alimentation", amount: 82.4, date: addDays(t, -3) },
      { id: "e2", label: "Abonnement transport", category: "Transport", amount: 75, date: addDays(t, -2) },
    ],
    budgetTarget: 900,
  };
  return data;
}
