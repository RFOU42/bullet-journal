import type { ModuleDef, ModuleId } from "./types";

export interface WizardStep {
  key: string;
  trackers: ModuleId[];
  color: string;
}

/** Sleep and mood get dedicated pages up front; habits + gratitude close the day together (design 10c). */
export const WIZARD_CORE_ORDER: ModuleId[] = ["sleep", "mood"];
export const WIZARD_FINAL_IDS: ModuleId[] = ["habits", "gratitude"];

export const WIZARD_NEXT_LABEL: Record<string, string> = {
  sleep: "sommeil",
  mood: "humeur du matin",
  pain: "douleur",
  final: "gratitude",
};

/**
 * Orders the day's active trackers into the wizard's fixed page sequence:
 * sleep, mood, then anything else (in catalogue order), then pain, then a
 * final page combining whichever of habits/gratitude are active. A tracker
 * not on "Aujourd'hui" is simply absent from `filModules` and gets no page.
 */
export function buildWizardSteps(filModules: ModuleDef[]): WizardStep[] {
  const byId = new Map(filModules.map((m) => [m.id, m]));
  const present = (id: ModuleId) => byId.has(id);
  const steps: WizardStep[] = [];

  for (const id of WIZARD_CORE_ORDER) {
    if (present(id)) steps.push({ key: id, trackers: [id], color: byId.get(id)!.color });
  }

  // Any other active tracker (activity, energy, cycle…) not otherwise placed,
  // in catalogue order, between mood and pain.
  for (const m of filModules) {
    if (WIZARD_CORE_ORDER.includes(m.id) || WIZARD_FINAL_IDS.includes(m.id) || m.id === "pain") continue;
    steps.push({ key: m.id, trackers: [m.id], color: m.color });
  }

  if (present("pain")) steps.push({ key: "pain", trackers: ["pain"], color: byId.get("pain")!.color });

  const finalTrackers = WIZARD_FINAL_IDS.filter(present);
  if (finalTrackers.length) {
    steps.push({ key: "final", trackers: finalTrackers, color: byId.get(finalTrackers[0])!.color });
  }
  return steps;
}
