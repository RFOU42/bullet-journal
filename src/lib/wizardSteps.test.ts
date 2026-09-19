import { describe, expect, it } from "vitest";
import { buildWizardSteps } from "./wizardSteps";
import { moduleDef, MODULES } from "./modules";
import type { ModuleId } from "./types";

const mods = (ids: ModuleId[]) => ids.map(moduleDef);

describe("buildWizardSteps", () => {
  it("orders the default five trackers as sleep, mood, pain, then a combined final page", () => {
    const steps = buildWizardSteps(mods(["mood", "pain", "sleep", "habits", "gratitude"]));
    expect(steps.map((s) => s.key)).toEqual(["sleep", "mood", "pain", "final"]);
    expect(steps.at(-1)!.trackers).toEqual(["habits", "gratitude"]);
  });

  it("drops a page entirely when its tracker isn't active on Aujourd'hui", () => {
    const steps = buildWizardSteps(mods(["mood", "sleep", "gratitude"])); // no pain, no habits
    expect(steps.map((s) => s.key)).toEqual(["sleep", "mood", "final"]);
    expect(steps.at(-1)!.trackers).toEqual(["gratitude"]);
  });

  it("gives the final page just one tracker when only one of habits/gratitude is active", () => {
    const steps = buildWizardSteps(mods(["sleep", "habits"]));
    expect(steps.at(-1)).toEqual({ key: "final", trackers: ["habits"], color: moduleDef("habits").color });
  });

  it("omits the final page entirely when neither habits nor gratitude is active", () => {
    const steps = buildWizardSteps(mods(["sleep", "pain"]));
    expect(steps.map((s) => s.key)).toEqual(["sleep", "pain"]);
  });

  it("places a tracker with no bespoke page (activity, energy, cycle…) in the order it's given, between mood and pain", () => {
    // buildWizardSteps trusts the caller's ordering for the "other" bucket —
    // the app always passes filModules in MODULES catalogue order, so build
    // the fixture the same way rather than hand-picking an order.
    const active: ModuleId[] = ["mood", "sleep", "activity", "energy", "pain"];
    const steps = buildWizardSteps(MODULES.filter((m) => active.includes(m.id)));
    expect(steps.map((s) => s.key)).toEqual(["sleep", "mood", "activity", "energy", "pain"]);
  });

  it("returns an empty list when nothing is active", () => {
    expect(buildWizardSteps([])).toEqual([]);
  });
});
