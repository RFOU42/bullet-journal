/** Domain groups, as they appear in Personnaliser and in the onboarding columns. */
export type DomainId = "bienetre" | "organisation" | "esprit" | "finances";

/** When in the day a tracker belongs — the backbone of the "fil du jour". */
export type Moment = "morning" | "day" | "evening";

export type ModuleId =
  | "mood"
  | "pain"
  | "sleep"
  | "cycle"
  | "activity"
  | "energy"
  | "habits"
  | "goals"
  | "notes"
  | "shopping"
  | "gratitude"
  | "books"
  | "quotes"
  | "budget";

/**
 * `tracker` modules are filled once a day and appear in the fil du jour.
 * `note` is filled daily too but has no "done" state, so it stays a page card.
 * `list` and `budget` modules hold their own collection, independent of the day.
 */
export type ModuleKind = "tracker" | "note" | "list" | "budget";

export interface ModuleDef {
  id: ModuleId;
  name: string;
  domain: DomainId;
  kind: ModuleKind;
  /** Accent used on cards and tracker rows. */
  color: string;
  /** Only trackers have a moment; it decides their group in the fil du jour. */
  moment?: Moment;
  defaultOn: boolean;
  defaultPage: string;
}

/* ---------- daily entries ---------- */

export interface SleepValue {
  bed: string;
  wake: string;
  quality?: number | null;
  note?: string;
}

export interface PainValue {
  value: number;
  note?: string;
  /** Body zones, as picked on the mobile entry page — additive to the free-text note. */
  zones?: string[];
}

export interface ActivityValue {
  minutes: number;
  kind?: string;
}

/** One day of the journal. Every field is optional: a day starts empty. */
export interface DayEntry {
  sleep?: SleepValue;
  /** 0–3, matching the four faces of the mood scale. */
  mood?: number;
  pain?: PainValue;
  /** Keyed by habit label so reordering habits never rewrites history. */
  habits?: Record<string, boolean>;
  gratitude?: string[];
  activity?: ActivityValue;
  /** 1–5 personal-weather / energy level. */
  energy?: number;
  cycle?: { day: number | null; flow?: string };
  notes?: string;
}

/* ---------- collections held by non-daily modules ---------- */

export interface Goal {
  id: string;
  label: string;
  target: number;
  current: number;
}

export interface ListItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  done: boolean;
}

export interface Quote {
  id: string;
  text: string;
  source: string;
}

export interface Expense {
  id: string;
  label: string;
  category: string;
  amount: number;
  /** Day key, so expenses can later be filtered by month. */
  date: string;
}

export interface Collections {
  goals: Goal[];
  shopping: ListItem[];
  books: Book[];
  quotes: Quote[];
  expenses: Expense[];
  budgetTarget: number;
}

/* ---------- settings ---------- */

export interface ModuleSettings {
  on: boolean;
  page: string;
}

export interface Settings {
  onboarded: boolean;
  pages: string[];
  modules: Record<ModuleId, ModuleSettings>;
  habits: string[];
  /** Hours of sleep aimed for — drawn as the objective line on the sleep chart. */
  sleepGoal: number;
}

export interface JournalData {
  version: 1;
  settings: Settings;
  entries: Record<string, DayEntry>;
  collections: Collections;
}
