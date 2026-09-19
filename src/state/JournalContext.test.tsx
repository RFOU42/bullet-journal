import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalProvider, useJournal } from "./JournalContext";
import { MODULES } from "../lib/modules";
import type { JournalData } from "../lib/types";

const baseline: JournalData = {
  version: 1,
  settings: {
    onboarded: true,
    pages: ["Aujourd'hui"],
    // Real module map (every id present), not the mocked storage module's —
    // JournalContext.filter(m => settings.modules[m.id].on) needs every
    // catalogue id to resolve, same as the real defaultSettings() would give it.
    modules: Object.fromEntries(MODULES.map((m) => [m.id, { on: m.defaultOn, page: m.defaultPage }])) as JournalData["settings"]["modules"],
    habits: ["Boire de l'eau"],
    sleepGoal: 7.5,
  },
  entries: {},
  collections: { goals: [], shopping: [], books: [], quotes: [], expenses: [], budgetTarget: 900 },
};

const loadJournal = vi.fn();
const saveJournal = vi.fn();

vi.mock("../lib/storage", () => ({
  emptyData: () => structuredClone(baseline),
  loadJournal: (...args: unknown[]) => loadJournal(...args),
  saveJournal: (...args: unknown[]) => saveJournal(...args),
}));

/** Exercises the context through the same API a screen would use. */
function Probe() {
  const journal = useJournal();
  return (
    <div>
      <span data-testid="status">{journal.syncStatus}</span>
      <span data-testid="mood">{String(journal.entries["2026-08-25"]?.mood ?? "none")}</span>
      <button onClick={() => journal.updateEntry("2026-08-25", { mood: 2 })}>set mood</button>
      <button onClick={() => void journal.flush()}>flush</button>
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  loadJournal.mockReset();
  saveJournal.mockReset();
  saveJournal.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("JournalProvider — load/save sequencing", () => {
  it("does not write back to Supabase the document it just loaded", async () => {
    loadJournal.mockResolvedValue(structuredClone(baseline));

    render(
      <JournalProvider userId="user-1">
        <Probe />
      </JournalProvider>,
    );

    expect(loadJournal).toHaveBeenCalledWith("user-1");
    expect(screen.getByTestId("status").textContent).toBe("loading");

    // Let loadJournal's promise resolve, then let the debounce window pass.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByTestId("status").textContent).toBe("saved");
    // The regression this guards: an async load must never trigger its own
    // save — only a genuine edit after the load should call saveJournal.
    expect(saveJournal).not.toHaveBeenCalled();
  });

  it("debounces a real edit into exactly one save, with the edited data", async () => {
    loadJournal.mockResolvedValue(structuredClone(baseline));

    render(
      <JournalProvider userId="user-1">
        <Probe />
      </JournalProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    saveJournal.mockClear();

    fireEvent.click(screen.getByText("set mood"));
    expect(screen.getByTestId("mood").textContent).toBe("2");
    expect(screen.getByTestId("status").textContent).toBe("saving");
    expect(saveJournal).not.toHaveBeenCalled(); // still debouncing

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(saveJournal).toHaveBeenCalledTimes(1);
    expect(saveJournal).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ entries: { "2026-08-25": { mood: 2 } } }),
    );
    expect(screen.getByTestId("status").textContent).toBe("saved");
  });

  it("flush() saves immediately instead of waiting out the debounce", async () => {
    loadJournal.mockResolvedValue(structuredClone(baseline));

    render(
      <JournalProvider userId="user-1">
        <Probe />
      </JournalProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    saveJournal.mockClear();

    fireEvent.click(screen.getByText("set mood"));
    expect(saveJournal).not.toHaveBeenCalled();

    // No time advance here — flush must not depend on the debounce firing.
    await act(async () => {
      fireEvent.click(screen.getByText("flush"));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(saveJournal).toHaveBeenCalledTimes(1);
  });

  it("reloads instead of reusing state when userId changes (switching accounts)", async () => {
    loadJournal.mockResolvedValueOnce(structuredClone(baseline));
    const other: JournalData = { ...structuredClone(baseline), entries: { "2026-08-20": { mood: 1 } } };
    loadJournal.mockResolvedValueOnce(other);

    const { rerender } = render(
      <JournalProvider userId="user-1">
        <Probe />
      </JournalProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    rerender(
      <JournalProvider userId="user-2">
        <Probe />
      </JournalProvider>,
    );
    expect(loadJournal).toHaveBeenLastCalledWith("user-2");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByTestId("mood").textContent).toBe("none"); // "2026-08-25" isn't in user-2's data
    expect(saveJournal).not.toHaveBeenCalled(); // still just an echoed load, no real edit
  });
});
