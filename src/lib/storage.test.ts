import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PAGES, MODULES } from "./modules";

// storage.ts talks to Supabase through this module — replace it with a
// chainable stub so these tests never touch a network, and can assert
// exactly which table/filter/payload the storage layer sends.
const maybeSingle = vi.fn();
const upsert = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn((_table: string) => ({ select, upsert }));

vi.mock("./supabaseClient", () => ({
  supabase: { from: (table: string) => from(table) },
}));

const { defaultCollections, defaultSettings, emptyData, loadJournal, parseImported, sampleData, saveJournal } =
  await import("./storage");

beforeEach(() => {
  from.mockClear();
  select.mockClear();
  eq.mockClear();
  maybeSingle.mockReset();
  upsert.mockReset();
});

describe("defaultSettings / emptyData / defaultCollections", () => {
  it("turns on every module the catalogue marks defaultOn, on its default page", () => {
    const settings = defaultSettings();
    for (const m of MODULES) {
      expect(settings.modules[m.id]).toEqual({ on: m.defaultOn, page: m.defaultPage });
    }
  });

  it("starts un-onboarded, with the default pages and no habits missing", () => {
    const settings = defaultSettings();
    expect(settings.onboarded).toBe(false);
    expect(settings.pages).toEqual(DEFAULT_PAGES);
    expect(settings.habits.length).toBeGreaterThan(0);
  });

  it("gives every collection an empty starting list", () => {
    const collections = defaultCollections();
    expect(collections.goals).toEqual([]);
    expect(collections.expenses).toEqual([]);
    expect(collections.budgetTarget).toBeGreaterThan(0);
  });

  it("emptyData composes settings + entries + collections into one document", () => {
    const data = emptyData();
    expect(data.version).toBe(1);
    expect(data.entries).toEqual({});
    expect(data.settings.onboarded).toBe(false);
  });
});

describe("parseImported (reconcile)", () => {
  it("returns clean defaults for garbage input", () => {
    expect(parseImported("null")).toEqual(emptyData());
    expect(parseImported("42")).toEqual(emptyData());
    expect(parseImported('"a string"')).toEqual(emptyData());
  });

  it("keeps a valid module override but ignores a malformed one", () => {
    const raw = {
      settings: {
        onboarded: true,
        modules: {
          sleep: { on: false, page: "Suivis & objectifs" }, // valid — kept
          mood: { on: "yes" }, // wrong shape — dropped, default kept
        },
      },
    };
    const result = parseImported(JSON.stringify(raw));
    expect(result.settings.onboarded).toBe(true);
    expect(result.settings.modules.sleep).toEqual({ on: false, page: "Suivis & objectifs" });
    expect(result.settings.modules.mood).toEqual(defaultSettings().modules.mood);
  });

  it("falls back to default pages/habits when the stored list is empty", () => {
    const raw = { settings: { pages: [], habits: [] } };
    const result = parseImported(JSON.stringify(raw));
    expect(result.settings.pages).toEqual(DEFAULT_PAGES);
    expect(result.settings.habits.length).toBeGreaterThan(0);
  });

  it("preserves entries and merges collections onto the defaults", () => {
    const raw = {
      entries: { "2026-08-25": { mood: 2 } },
      collections: { budgetTarget: 1200 },
    };
    const result = parseImported(JSON.stringify(raw));
    expect(result.entries).toEqual({ "2026-08-25": { mood: 2 } });
    expect(result.collections.budgetTarget).toBe(1200);
    expect(result.collections.goals).toEqual([]); // untouched collections still default
  });

  it("ignores entries that aren't an object", () => {
    const result = parseImported(JSON.stringify({ entries: "not-an-object" }));
    expect(result.entries).toEqual({});
  });
});

describe("sampleData", () => {
  it("seeds five days of entries and leaves onboarding to the caller", () => {
    const data = sampleData();
    expect(Object.keys(data.entries)).toHaveLength(5);
    expect(data.settings.onboarded).toBe(false);
    expect(data.collections.books.length).toBeGreaterThan(0);
  });

  it("is a valid document parseImported would accept unchanged", () => {
    const data = sampleData();
    const roundTripped = parseImported(JSON.stringify(data));
    expect(roundTripped.entries).toEqual(data.entries);
  });
});

describe("loadJournal", () => {
  it("returns a fresh empty document when the user has no row yet", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const result = await loadJournal("user-1");
    expect(from).toHaveBeenCalledWith("journals");
    expect(select).toHaveBeenCalledWith("data");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual(emptyData());
  });

  it("returns a fresh empty document on a query error, rather than throwing", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(loadJournal("user-1")).resolves.toEqual(emptyData());
  });

  it("reconciles the stored document onto current defaults", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { data: { settings: { onboarded: true }, entries: { "2026-08-25": { mood: 3 } } } },
      error: null,
    });
    const result = await loadJournal("user-1");
    expect(result.settings.onboarded).toBe(true);
    expect(result.entries).toEqual({ "2026-08-25": { mood: 3 } });
  });
});

describe("saveJournal", () => {
  it("upserts the document under the user's id and reports success", async () => {
    upsert.mockResolvedValueOnce({ error: null });
    const data = emptyData();
    const result = await saveJournal("user-1", data);
    expect(from).toHaveBeenCalledWith("journals");
    expect(upsert).toHaveBeenCalledWith({ user_id: "user-1", data });
    expect(result).toEqual({ ok: true });
  });

  it("reports failure without throwing when the write errors", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "network down" } });
    await expect(saveJournal("user-1", emptyData())).resolves.toEqual({ ok: false });
  });
});
