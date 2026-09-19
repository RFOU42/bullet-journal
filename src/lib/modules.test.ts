import { describe, expect, it } from "vitest";
import { DEFAULT_PAGES, DOMAINS, MODULES, moduleDef, MOOD_GLYPHS, MOOD_LABELS } from "./modules";

describe("MODULES catalogue", () => {
  it("has a unique id per module", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only assigns a moment to tracker-kind modules", () => {
    for (const m of MODULES) {
      if (m.kind === "tracker") expect(m.moment).toBeDefined();
      else expect(m.moment).toBeUndefined();
    }
  });

  it("gives every module a default page that exists in DEFAULT_PAGES", () => {
    for (const m of MODULES) expect(DEFAULT_PAGES).toContain(m.defaultPage);
  });

  it("gives every module a domain present in DOMAINS", () => {
    for (const m of MODULES) expect(DOMAINS[m.domain]).toBeDefined();
  });
});

describe("moduleDef", () => {
  it("returns the matching module definition", () => {
    expect(moduleDef("sleep").name).toBe("Sommeil");
  });

  it("throws on an id outside the catalogue", () => {
    // @ts-expect-error deliberately invalid id, to exercise the runtime guard
    expect(() => moduleDef("not-a-module")).toThrow();
  });
});

describe("mood scale", () => {
  it("keeps glyphs and labels the same length, index-aligned", () => {
    expect(MOOD_GLYPHS).toHaveLength(MOOD_LABELS.length);
  });
});
