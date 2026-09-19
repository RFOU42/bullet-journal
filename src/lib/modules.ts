import type { DomainId, ModuleDef, ModuleId, Moment } from "./types";

/** Palette from the "carnet papier" direction (2a). */
export const C = {
  paper: "#FAF8F3",
  paperDeep: "#F1ECE0",
  cream: "#FBF7F0",
  dot: "#DAD1BC",
  line: "#E7DFD0",
  rule: "#EFE7DC",
  ink: "#26241F",
  inkSoft: "#6B665C",
  muted: "#8d8677",
  faint: "#a09786",
  indigo: "#3D5A80",
  rose: "#C9667A",
  sage: "#6B8F71",
  ochre: "#B98430",
  plum: "#7D5BA6",
} as const;

export const DOMAINS: Record<DomainId, { label: string; short: string; color: string }> = {
  bienetre: { label: "Santé & bien-être", short: "bien-être", color: C.rose },
  organisation: { label: "Organisation", short: "organisation", color: C.sage },
  esprit: { label: "Esprit & inspiration", short: "esprit", color: C.plum },
  finances: { label: "Finances", short: "finances", color: C.ochre },
};

export const MOMENTS: { id: Moment; label: string }[] = [
  { id: "morning", label: "au réveil" },
  { id: "day", label: "dans la journée" },
  { id: "evening", label: "le soir" },
];

export const DEFAULT_PAGES = ["Aujourd'hui", "Suivis & objectifs", "Lecture & inspiration"];
export const TODAY_PAGE = DEFAULT_PAGES[0];

/**
 * The V1 module catalogue, in the order and grouping shown on the onboarding
 * screen. Ten are on by default — the "10 modules, c'est déjà bien" starting set.
 */
export const MODULES: ModuleDef[] = [
  { id: "mood", name: "Humeur", domain: "bienetre", kind: "tracker", color: C.rose, moment: "morning", defaultOn: true, defaultPage: DEFAULT_PAGES[0] },
  { id: "pain", name: "Douleurs", domain: "bienetre", kind: "tracker", color: C.rose, moment: "evening", defaultOn: true, defaultPage: DEFAULT_PAGES[0] },
  { id: "sleep", name: "Sommeil", domain: "bienetre", kind: "tracker", color: C.indigo, moment: "morning", defaultOn: true, defaultPage: DEFAULT_PAGES[0] },
  { id: "cycle", name: "Cycle menstruel", domain: "bienetre", kind: "tracker", color: C.rose, moment: "day", defaultOn: false, defaultPage: DEFAULT_PAGES[1] },
  { id: "activity", name: "Activité physique", domain: "bienetre", kind: "tracker", color: C.sage, moment: "day", defaultOn: true, defaultPage: DEFAULT_PAGES[1] },
  { id: "energy", name: "Météo perso", domain: "bienetre", kind: "tracker", color: C.sage, moment: "morning", defaultOn: false, defaultPage: DEFAULT_PAGES[0] },

  { id: "habits", name: "Habitudes", domain: "organisation", kind: "tracker", color: C.sage, moment: "day", defaultOn: true, defaultPage: DEFAULT_PAGES[0] },
  { id: "goals", name: "Objectifs", domain: "organisation", kind: "list", color: C.sage, defaultOn: true, defaultPage: DEFAULT_PAGES[1] },
  { id: "notes", name: "Notes rapides", domain: "organisation", kind: "note", color: C.ochre, defaultOn: true, defaultPage: DEFAULT_PAGES[0] },
  { id: "shopping", name: "Liste d'objets", domain: "organisation", kind: "list", color: C.sage, defaultOn: false, defaultPage: DEFAULT_PAGES[1] },

  { id: "gratitude", name: "Gratitude", domain: "esprit", kind: "tracker", color: C.plum, moment: "evening", defaultOn: true, defaultPage: DEFAULT_PAGES[0] },
  { id: "books", name: "Livres à lire", domain: "esprit", kind: "list", color: C.plum, defaultOn: true, defaultPage: DEFAULT_PAGES[2] },
  { id: "quotes", name: "Citations", domain: "esprit", kind: "list", color: C.plum, defaultOn: false, defaultPage: DEFAULT_PAGES[2] },

  { id: "budget", name: "Budget personnel", domain: "finances", kind: "budget", color: C.ochre, defaultOn: true, defaultPage: DEFAULT_PAGES[1] },
];

const BY_ID = new Map(MODULES.map((m) => [m.id, m]));

export function moduleDef(id: ModuleId): ModuleDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Module inconnu : ${id}`);
  return def;
}

export const DEFAULT_HABITS = ["Boire de l'eau", "Méditer", "Étirements"];

export const MOOD_GLYPHS = ["😞", "😐", "🙂", "😄"];
export const MOOD_LABELS = ["difficile", "moyen", "plutôt bien", "très bien"];

/** Light → dark rose ramp for pain intensity in the weekly grid. */
export const PAIN_SHADES = ["#F0DDE1", "#E7C6CD", "#DDAFB9", "#D398A5", "#C9667A", "#B04E62"];
